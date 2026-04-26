import {defineConfig, env} from 'prisma/config';
import {config} from 'dotenv';
import {fileURLToPath} from 'url';
import {dirname} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({path: `${__dirname}/../.env.dev`});

export default defineConfig({
  schema: `${__dirname}/prisma/schema.prisma`,
  datasource: {
    url: env('DATABASE_URL'),
  },
});
