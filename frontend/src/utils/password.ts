// The same rules, in the same order and with the same messages, as strongPassword in
// backend/src/controllers/auth.controller.ts. The backend checks again on its own; this
// only shows the rules up front and saves a request that would be refused.
export const passwordRules = [
  {
    label: 'At least 8 characters',
    message: 'Password must be at least 8 characters',
    isMet: (password: string) => password.length >= 8,
  },
  {
    label: 'An uppercase letter',
    message: 'Password must contain at least one uppercase letter',
    isMet: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: 'A lowercase letter',
    message: 'Password must contain at least one lowercase letter',
    isMet: (password: string) => /[a-z]/.test(password),
  },
  {
    label: 'A number',
    message: 'Password must contain at least one number',
    isMet: (password: string) => /[0-9]/.test(password),
  },
  {
    label: 'A symbol: @ $ ! % * ? & #',
    message: 'Password must contain at least one special character',
    isMet: (password: string) => /[@$!%*?&#]/.test(password),
  },
];

// The message of the first rule the password breaks, or undefined if it follows them all
export const firstPasswordProblem = (password: string) =>
  passwordRules.find((rule) => !rule.isMet(password))?.message;
