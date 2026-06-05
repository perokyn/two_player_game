import 'dotenv/config';
import { getPrisma } from './src/lib/prisma.ts';

async function main() {
  const prisma = await getPrisma();
  console.log("PRISMA MODEL KEYS:", Object.keys(prisma));
  if (prisma.note) {
    console.log("NOTE MODEL EXISTS!");
  } else {
    console.log("NOTE MODEL DOES NOT EXIST!");
  }
}
main().catch(console.error);
