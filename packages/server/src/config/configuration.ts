import { registerAs } from '@nestjs/config';

export const configuration = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? process.env.APP_PORT ?? '', 10) || 3000,
  nodeEnv: process.env.NODE_ENV || process.env.APP_ENV || 'development',

  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '', 10) || 5432,
    name: process.env.DATABASE_NAME || 'opc_agent_system',
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '', 10) || 6379,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  ai: {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3',
    },
  },
}));

export default configuration;
