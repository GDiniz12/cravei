import prisma from './src/prismaClient';
async function main() {
  const c = await prisma.championship.findMany();
  console.log(JSON.stringify(c, null, 2));
}
main();
