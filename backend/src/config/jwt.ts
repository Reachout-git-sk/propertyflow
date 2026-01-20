export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
};