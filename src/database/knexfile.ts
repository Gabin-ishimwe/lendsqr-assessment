import type { Knex } from "knex";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

// Update with your config settings.
const knexConfig: { [key: string]: Knex.Config } = {
  dev: {
    client: "postgresql",
    connection: process.env.DATABASE_URL || {
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER_NAME,
      password: process.env.DATABASE_PASSWORD,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
    },
    seeds: {
      directory: "./seeds",
    },
  },

  test: {
    client: "postgresql",
    connection: process.env.DATABASE_URL || {
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER_NAME,
      password: process.env.DATABASE_PASSWORD,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
    },
  },

  prod: {
    client: "postgresql",
    connection: process.env.DATABASE_URL || {
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USER_NAME,
      password: process.env.DATABASE_PASSWORD,
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
    },
  },
};

export default knexConfig;
