import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

// The tests set up their data through the database OWNER connection (DATABASE_URL).
// Think of it as the building manager's master key: it is only for setup and checks,
// never for the app itself.
export const ownerDb = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });

// Empties every table (but keeps the migrations table) so each test file starts clean.
export async function resetDatabase() {
  const tables = await ownerDb.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await ownerDb.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

// A real signed JWT, the same kind the login route returns.
export function tokenFor(user: { id: string; email: string; role: string }) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET!, {
    expiresIn: '1h',
  });
}

/**
 * Builds a small building with two tenants who must never see each other's data:
 *   - Alice rents unit 101, Bob rents unit 102
 *   - each has one ticket, one payment and one document
 *   - plus one admin and one worker
 */
export async function createWorld() {
  const user = (role: 'ADMIN' | 'TENANT' | 'WORKER', name: string) =>
    ownerDb.user.create({
      data: {
        email: `${name.toLowerCase()}@test.local`,
        passwordHash: 'not-used-in-these-tests',
        role,
        firstName: name,
        lastName: 'Test',
      },
    });

  const admin = await user('ADMIN', 'Admin');
  const alice = await user('TENANT', 'Alice');
  const bob = await user('TENANT', 'Bob');
  const workerUser = await user('WORKER', 'Walter');
  const worker = await ownerDb.worker.create({ data: { userId: workerUser.id, skills: ['PLUMBING'] } });

  const property = await ownerDb.property.create({
    data: { name: 'Test Apartments', address: '1 Test Street' },
  });
  const unitA = await ownerDb.unit.create({ data: { propertyId: property.id, unitNumber: '101' } });
  const unitB = await ownerDb.unit.create({ data: { propertyId: property.id, unitNumber: '102' } });

  const tenancy = (tenantId: string, unitId: string) =>
    ownerDb.tenancy.create({
      data: {
        tenantId,
        unitId,
        leaseStart: new Date('2026-01-01'),
        leaseEnd: new Date('2027-01-01'),
        rentAmount: 1000,
      },
    });
  const tenancyA = await tenancy(alice.id, unitA.id);
  const tenancyB = await tenancy(bob.id, unitB.id);

  // No ticketNumber: the database assigns it, exactly as in the app
  const ticket = (tenantId: string, unitId: string, title: string) =>
    ownerDb.ticket.create({
      data: {
        tenantId,
        unitId,
        title,
        description: 'Something in the unit needs fixing',
        category: 'PLUMBING',
      },
    });
  const ticketA = await ticket(alice.id, unitA.id, "Alice's leaking sink");
  const ticketB = await ticket(bob.id, unitB.id, "Bob's broken heater");

  const payment = (tenancyId: string) =>
    ownerDb.paymentRecord.create({
      data: { tenancyId, amount: 1000, paymentType: 'RENT', paymentDate: new Date('2026-10-01') },
    });
  const paymentA = await payment(tenancyA.id);
  const paymentB = await payment(tenancyB.id);

  const documentA = await ownerDb.document.create({
    data: {
      tenancyId: tenancyA.id,
      documentType: 'LEASE',
      fileName: 'alice-lease.pdf',
      filePath: 'does-not-exist.pdf',
    },
  });

  return {
    admin,
    alice,
    bob,
    workerUser,
    worker,
    unitA,
    unitB,
    tenancyA,
    tenancyB,
    ticketA,
    ticketB,
    paymentA,
    paymentB,
    documentA,
    tokens: {
      admin: tokenFor(admin),
      alice: tokenFor(alice),
      bob: tokenFor(bob),
      worker: tokenFor(workerUser),
    },
  };
}

export type World = Awaited<ReturnType<typeof createWorld>>;

// A tiny fake image for upload tests
export const fakePng = {
  buffer: Buffer.from('not really a png'),
  options: { filename: 'photo.png', contentType: 'image/png' },
};
