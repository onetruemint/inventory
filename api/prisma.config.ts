import {defineConfig} from 'prisma/config';
import {config} from 'dotenv';
import {fileURLToPath} from 'url';
import {dirname} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({path: `${__dirname}/../.env.dev`});

export default defineConfig({
  schema: `${__dirname}/prisma/schema.prisma`,
  datasource: {
    // Fallback keeps `prisma generate` working in CI and fresh clones without .env.dev.
    // Runtime connections use the adapter in db.ts, so this URL is only read by the CLI.
    url:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/postgres',
  },
});
