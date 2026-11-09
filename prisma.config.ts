import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI reads this for every command. Generate and validate do not need
// a database connection, while migrate deploy will reject a missing URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
