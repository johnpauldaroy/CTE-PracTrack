import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const DEMO_PASSWORD = "PracTrack2026!";

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

/**
 * Demo accounts matching the names/emails shown in the mockup deck
 * (UI_FLOW_SPEC.md §2.7-2.9) so the seeded data reads coherently across
 * screens. All demo accounts share DEMO_PASSWORD — change before any
 * real deployment; this is seed data for dev/thesis-defense only.
 */
export async function seedAccounts(schoolIdsByName: Record<string, string>) {
  const passwordHash = await hash(DEMO_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: "dsantos@antiquespride.edu.ph" },
    update: {},
    create: {
      email: "dsantos@antiquespride.edu.ph",
      passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      name: "Dr. Donna Santos",
    },
  });

  const supervisorSeeds = [
    { name: "Prof. Maria Villanueva", email: "mvillanueva@antiquespride.edu.ph", department: "Language Education", school: "Barbaza National High School" },
    { name: "Prof. Jose Arcega", email: "jarcega@antiquespride.edu.ph", department: "Science Education", school: "Patria National High School" },
    { name: "Prof. Ana Malaguit", email: "amalaguit@antiquespride.edu.ph", department: "Social Studies Education", school: "Bitadton National High School" },
    { name: "Prof. Ramon Casipe", email: "rcasipe@antiquespride.edu.ph", department: "Mathematics Education", school: "Pandan National Vocational School" },
  ];

  for (const s of supervisorSeeds) {
    const schoolId = schoolIdsByName[s.school];
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { email: s.email, passwordHash, role: "SUPERVISOR", status: "ACTIVE", name: s.name },
    });
    await prisma.supervisorProfile.upsert({
      where: { userId: user.id },
      update: { schoolId, department: s.department },
      create: { userId: user.id, schoolId, department: s.department },
    });
  }

  const ctActive = await prisma.user.upsert({
    where: { email: "cferolin@antiquespride.edu.ph" },
    update: {},
    create: {
      email: "cferolin@antiquespride.edu.ph",
      passwordHash,
      role: "COOPERATING_TEACHER",
      status: "ACTIVE",
      name: "Mr. Carlo Ferolin",
    },
  });
  const ctProfile = await prisma.cooperatingTeacherProfile.upsert({
    where: { userId: ctActive.id },
    update: {},
    create: {
      userId: ctActive.id,
      schoolId: schoolIdsByName["Barbaza National High School"],
      approvedByUserId: admin.id,
      approvedAt: new Date(),
    },
  });

  const ctPending = await prisma.user.upsert({
    where: { email: "rpineda@gmail.com" },
    update: {},
    create: {
      email: "rpineda@gmail.com",
      passwordHash,
      role: "COOPERATING_TEACHER",
      status: "PENDING",
      name: "Ms. Rosalinda Pineda",
      phone: "09175551234",
    },
  });
  await prisma.cooperatingTeacherProfile.upsert({
    where: { userId: ctPending.id },
    update: {},
    create: { userId: ctPending.id, schoolId: schoolIdsByName["Barbaza National High School"] },
  });

  const internNames = [
    "Juan Dela Cruz",
    "Maria Santos",
    "Pedro Reyes",
    "Ana Flores",
    "Mark Garcia",
    "Claire Navarro",
    "Luis Domingo",
    "Hazel Cinco",
    "Rachel Lim",
    "Ben Torres",
    "Rhea Villanueva",
    "Lea Magno",
    "Jerome Bautista",
  ];
  const barbazaSchoolId = schoolIdsByName["Barbaza National High School"];
  const barbazaSupervisor = await prisma.user.findUniqueOrThrow({
    where: { email: "mvillanueva@antiquespride.edu.ph" },
  });

  let schoolNumberSeq = 45;
  for (const name of internNames) {
    const emailLocal = name.toLowerCase().replace(/[^a-z\s]/g, "").trim().split(/\s+/).reduce((acc, part, i) => (i === 0 ? part[0] : acc + part), "");
    const email = `${emailLocal}@antiquespride.edu.ph`;
    const schoolNumber = `2021-${String(schoolNumberSeq++).padStart(4, "0")}`;

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash, role: "STUDENT_INTERN", status: "ACTIVE", name },
    });

    await prisma.internProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        schoolNumber,
        course: "BSEd-English",
        yearLevel: "3rd Year",
        assignedSchoolId: barbazaSchoolId,
        cooperatingTeacherId: ctProfile.id,
        createdByUserId: barbazaSupervisor.id,
      },
    });
  }

  console.log(
    `[seed] Accounts: 1 admin, ${supervisorSeeds.length} supervisors, 1 active + 1 pending CT, ${internNames.length} interns (all Barbaza NHS). Password for all demo accounts: ${DEMO_PASSWORD}`,
  );
}
