// prisma.config.ts
import "dotenv/config"; // <-- loads .env into process.env
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // env("DATABASE_URL") will read from process.env (dotenv above ensures .env is loaded)
    url: env("DATABASE_URL"),
  },
});
