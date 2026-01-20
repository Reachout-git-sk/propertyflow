export const generateTicketNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `TKT-${year}-${random}`;
};