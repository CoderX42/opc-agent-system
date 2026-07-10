import { registerAs } from "@nestjs/config";

export const configuration = registerAs("app", () => ({
  port: parseInt(process.env.PORT ?? process.env.APP_PORT ?? "", 10) || 3000,
  nodeEnv: process.env.NODE_ENV || process.env.APP_ENV || "development",

  database: {
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT ?? "", 10) || 3306,
    name: process.env.DATABASE_NAME || "agent-system",
    user: process.env.DATABASE_USER || "agent-system",
    password: process.env.DATABASE_PASSWORD,
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "", 10) || 6379,
    db: parseInt(process.env.REDIS_DB ?? "", 10) || 0,
    password: process.env.REDIS_PASSWORD,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  ai: {
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || "",
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "llama3",
    },
  },
}));

export default configuration;
