import { DataSource } from "typeorm";

const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.DATABASE_HOST || "localhost",
  port: Number(process.env.DATABASE_PORT) || 3306,
  username: process.env.DATABASE_USER || "agent-system",
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || "agent-system",
  charset: "utf8mb4",
  entities: [__dirname + "/../**/*.entity{.ts,.js}"],
  migrations: [__dirname + "/migrations/mysql/*{.ts,.js}"],
  synchronize: false,
  logging: process.env.DATABASE_LOGGING === "true",
});

export default AppDataSource;
