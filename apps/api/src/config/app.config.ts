// src/config/app.config.ts — adapted from zylosync (config factory pattern).

export const appConfig = () => {
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'AI_CONFIG_SECRET'];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
        'Please check your .env / .env.local file and ensure these variables are set.',
    );
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  return {
    port: parseInt(process.env.PORT ?? '4000', 10),
    jwt: {
      secret: process.env.JWT_SECRET as string,
      expiresIn: '7d',
    },
  };
};
