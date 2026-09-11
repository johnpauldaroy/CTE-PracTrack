import { prisma } from "@/lib/prisma";
import { seedConfigSingletons } from "./config";
import { seedEvaluationInstrument } from "./evaluation-instrument";
import { seedSchools } from "./schools";
import { seedAcademicPeriod } from "./academic-period";
import { seedAccounts } from "./accounts";

async function main() {
  console.log("[seed] Starting...");

  await seedConfigSingletons();
  await seedEvaluationInstrument();
  const schoolIdsByName = await seedSchools();
  await seedAcademicPeriod();
  await seedAccounts(schoolIdsByName);

  console.log("[seed] Done.");
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
