import "dotenv/config";
import { prisma } from "./src/lib/prisma";

async function main() {
  try {
    const [users, schools, shiftings] = await Promise.all([
      prisma.user.count(),
      prisma.school.count(),
      prisma.shifting.count(),
    ]);
    console.log(JSON.stringify({ users, schools, shiftings }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
