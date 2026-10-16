import path from 'path';
import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import * as access from '../src/utils/access';
import { createWorld, fakePng, ownerDb, resetDatabase, World } from './helpers';

// Uploaded files (ticket photos, rent receipts, lease documents) are private.
// They used to be served from /uploads to ANYONE who had the link, with no login at all.
// Now that folder is not public. Each file is downloaded through a route that checks the
// login and applies the same ownership rules as the record the file belongs to.

let w: World;
let attachmentA: { id: string; filePath: string };
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const attachmentUrl = (ticketId: string, attachmentId: string) =>
  `/api/tickets/${ticketId}/attachments/${attachmentId}`;

// Downloads a file and returns its raw bytes, so a test can compare them with what was uploaded
const downloadBytes = (url: string, token: string) =>
  request(app)
    .get(url)
    .set(auth(token))
    .buffer(true)
    .parse((res, done) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => done(null, Buffer.concat(chunks)));
    });

beforeAll(async () => {
  await resetDatabase();
  w = await createWorld();

  // Alice adds a photo to her ticket and a receipt to her payment, through the real routes
  const photo = await request(app)
    .post(`/api/tickets/${w.ticketA.id}/attachments`)
    .set(auth(w.tokens.alice))
    .attach('file', fakePng.buffer, fakePng.options);
  expect(photo.status).toBe(201);
  attachmentA = photo.body.data;

  const receipt = await request(app)
    .post(`/api/payments/${w.paymentA.id}/receipt`)
    .set(auth(w.tokens.alice))
    .attach('receipt', fakePng.buffer, fakePng.options);
  expect(receipt.status).toBe(200);
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
  await ownerDb.$disconnect();
});

describe('the /uploads folder', () => {
  it('is not public any more: a direct link to a stored file gets 404, with no login', async () => {
    const res = await request(app).get(`/uploads/${path.basename(attachmentA.filePath)}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Route not found');
  });
});

describe('GET /api/tickets/:id/attachments/:attachmentId', () => {
  it('lets Alice download the photo on her own ticket', async () => {
    const res = await downloadBytes(attachmentUrl(w.ticketA.id, attachmentA.id), w.tokens.alice);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakePng.buffer);
    // "attachment" = the browser saves the file instead of opening it on our site
    expect(res.headers['content-disposition']).toBe('attachment; filename="photo.png"');
  });

  it('lets staff (admin and worker) download it, like they can read the ticket', async () => {
    for (const token of [w.tokens.admin, w.tokens.worker]) {
      const res = await downloadBytes(attachmentUrl(w.ticketA.id, attachmentA.id), token);
      expect(res.status).toBe(200);
    }
  });

  it("returns 404 when Bob asks for the photo on Alice's ticket", async () => {
    const res = await request(app)
      .get(attachmentUrl(w.ticketA.id, attachmentA.id))
      .set(auth(w.tokens.bob));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Attachment not found');
  });

  it("returns 404 when Bob puts Alice's attachment id under his own ticket", async () => {
    const res = await request(app)
      .get(attachmentUrl(w.ticketB.id, attachmentA.id))
      .set(auth(w.tokens.bob));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Attachment not found');
  });

  it('needs a login', async () => {
    const res = await request(app).get(attachmentUrl(w.ticketA.id, attachmentA.id));
    expect(res.status).toBe(401);
  });

  it('still returns 404 to Bob when the code-level check is switched off (row-level security)', async () => {
    jest.spyOn(access, 'ownedBy').mockReturnValue({});
    const res = await request(app)
      .get(attachmentUrl(w.ticketA.id, attachmentA.id))
      .set(auth(w.tokens.bob));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/payments/:id/receipt', () => {
  it('lets Alice download the receipt on her own payment', async () => {
    const res = await downloadBytes(`/api/payments/${w.paymentA.id}/receipt`, w.tokens.alice);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakePng.buffer);
  });

  it('lets an admin download it', async () => {
    const res = await downloadBytes(`/api/payments/${w.paymentA.id}/receipt`, w.tokens.admin);
    expect(res.status).toBe(200);
  });

  it("returns 404 when Bob asks for Alice's receipt", async () => {
    const res = await request(app).get(`/api/payments/${w.paymentA.id}/receipt`).set(auth(w.tokens.bob));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Receipt not found');
  });

  it('returns 404 for a payment that has no receipt yet', async () => {
    const res = await request(app).get(`/api/payments/${w.paymentB.id}/receipt`).set(auth(w.tokens.bob));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Receipt not found');
  });

  it('does not let workers download rent receipts', async () => {
    const res = await request(app).get(`/api/payments/${w.paymentA.id}/receipt`).set(auth(w.tokens.worker));
    expect(res.status).toBe(403);
  });
});

describe('only files inside the upload folder are ever sent', () => {
  // The file path comes from the database, and a row can point anywhere: inspection
  // findings, for example, store a photo path taken straight from the request body.
  // A path like this one must never turn a download route into "read any file on the server".
  const outsidePath = path.resolve('package.json');

  it('refuses a document whose path points outside the upload folder', async () => {
    await ownerDb.document.update({ where: { id: w.documentA.id }, data: { filePath: outsidePath } });
    const res = await request(app)
      .get(`/api/documents/${w.documentA.id}/download`)
      .set(auth(w.tokens.alice));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('File not found on server');
  });

  it('refuses a ticket attachment whose path points outside the upload folder', async () => {
    const planted = await ownerDb.ticketAttachment.create({
      data: { ticketId: w.ticketA.id, fileName: 'package.json', filePath: outsidePath },
    });
    const res = await request(app)
      .get(attachmentUrl(w.ticketA.id, planted.id))
      .set(auth(w.tokens.alice));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('File not found on server');
  });

  it('still downloads documents that were uploaded through the app', async () => {
    const upload = await request(app)
      .post('/api/documents')
      .set(auth(w.tokens.alice))
      .field('tenancyId', w.tenancyA.id)
      .field('documentType', 'INSURANCE')
      .attach('document', fakePng.buffer, fakePng.options);
    expect(upload.status).toBe(201);

    const res = await downloadBytes(`/api/documents/${upload.body.data.id}/download`, w.tokens.alice);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakePng.buffer);
  });
});
