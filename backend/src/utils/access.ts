// Who is making the request. It comes from the verified JWT (see middleware/auth.ts).
export type Viewer = {
  id: string;
  role: string;
};

/**
 * A Prisma `where` filter that limits a query to rows the viewer owns.
 *
 * Tickets and tenancies both store their owner in `tenantId`.
 * - A TENANT only matches their own rows.
 * - ADMIN and WORKER match every row (an empty filter).
 *
 * Use it together with the record id, for example
 *   prisma.ticket.findFirst({ where: { id, ...ownedBy(viewer) } })
 * so "it does not exist" and "it is not yours" both come back as null,
 * and the API answers 404 in both cases. That way a tenant cannot learn
 * which ids belong to other people.
 */
export const ownedBy = (viewer: Viewer) =>
  viewer.role === 'TENANT' ? { tenantId: viewer.id } : {};
