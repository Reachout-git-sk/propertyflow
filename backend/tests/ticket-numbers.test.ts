import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { createWorld, ownerDb, resetDatabase, World } from './helpers';

// Ticket numbers like TKT-2026-000042 must be unique. They used to be 4 random digits,
// so two tickets could draw the same number, and the second one then crashed with a
// "unique constraint" error. Now PostgreSQL hands out the numbers from a sequence.

let w: World;
const year = new Date().getFullYear();

const fileTicket = (title: string) =>
  request(app).post('/api/tickets').set({ Authorization: `Bearer ${w.tokens.bob}` }).send({
    unitId: w.unitB.id,
    title,
    description: 'Something in unit 102 needs fixing',
    category: 'GENERAL',
  });

// "TKT-2026-000042" -> 42
const counterOf = (ticketNumber: string) => Number(ticketNumber.split('-')[2]);

beforeAll(async () => {
  await resetDatabase();
  w = await createWorld();
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
  await ownerDb.$disconnect();
});

it('gives tickets numbers like TKT-<year>-000123', async () => {
  const res = await fileTicket('Format check');
  expect(res.status).toBe(201);
  expect(res.body.data.ticketNumber).toMatch(new RegExp(`^TKT-${year}-\\d{6,}$`));
});

it('gives each new ticket the next number', async () => {
  const first = await fileTicket('First in a row');
  const second = await fileTicket('Second in a row');
  expect(counterOf(second.body.data.ticketNumber)).toBe(counterOf(first.body.data.ticketNumber) + 1);
});

it('does not depend on random numbers (the old collision bug)', async () => {
  // With the old code, two equal random draws meant two equal ticket numbers,
  // and the second request failed with a 500. Force "equal draws" and check both succeed.
  jest.spyOn(Math, 'random').mockReturnValue(0.42);
  const first = await fileTicket('Same random draw 1');
  const second = await fileTicket('Same random draw 2');
  expect([first.status, second.status]).toEqual([201, 201]);
  expect(first.body.data.ticketNumber).not.toBe(second.body.data.ticketNumber);
});

it('gives 30 tickets filed at the same moment 30 different numbers', async () => {
  const responses = await Promise.all(
    Array.from({ length: 30 }, (_, i) => fileTicket(`Burst ticket ${i}`))
  );
  expect(responses.every((r) => r.status === 201)).toBe(true);
  const numbers = new Set(responses.map((r) => r.body.data.ticketNumber));
  expect(numbers.size).toBe(30);
});
