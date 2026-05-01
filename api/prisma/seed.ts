import {config} from 'dotenv';
import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';
import {Pool} from 'pg';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({path: resolve(__dirname, '../../.env.dev')});

const pool = new Pool({connectionString: process.env.DATABASE_URL});
const prisma = new PrismaClient({adapter: new PrismaPg(pool)});

async function main() {
  const passwordHash = await bcrypt.hash('password', 10);

  const user = await prisma.user.upsert({
    where: {email: 'test@example.com'},
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash,
      memberships: {
        create: {
          role: 'OWNER',
          household: {
            create: {name: 'Test Household'},
          },
        },
      },
    },
  });

  console.log(`Seeded user: ${user.email} (id: ${user.id})`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
