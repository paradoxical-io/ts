export type AuthStrategy = 'phone' | 'password' | 'google';

export const authStrategies = {
  phoneAuth: 'phone' as AuthStrategy,
  passwordAuth: 'password' as AuthStrategy,
  adminAuth: 'session' as AuthStrategy,
};
