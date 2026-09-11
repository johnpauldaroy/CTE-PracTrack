import { prisma } from "@/lib/prisma";
import type { SchoolType } from "@/generated/prisma/client";

/**
 * The 15 partner schools named across the mockup deck (UI_FLOW_SPEC.md §1.2,
 * §2.2, §2.11). Coordinates are approximate municipal town-center points —
 * NOT surveyed school locations — good enough to exercise the geofence math
 * in dev/demo, but an admin must correct each one via the real map picker
 * before this is production data. geofenceRadiusMeters uses the PRD §6.2
 * mockup default (75m) throughout.
 */
export const SCHOOLS: Array<{
  name: string;
  type: SchoolType;
  municipality: string;
  latitude: number;
  longitude: number;
  internCount: number; // used only to size demo intern generation, not stored
}> = [
  { name: "Patria National High School", type: "SECONDARY", municipality: "Hamtic", latitude: 10.7132, longitude: 121.9569, internCount: 8 },
  { name: "Pandan National Vocational School", type: "SECONDARY", municipality: "Pandan", latitude: 11.7218, longitude: 122.0942, internCount: 7 },
  { name: "Sebaste High School", type: "SECONDARY", municipality: "Sebaste", latitude: 11.5717, longitude: 122.0736, internCount: 6 },
  { name: "Bitadton National High School", type: "SECONDARY", municipality: "Bugasong", latitude: 10.9014, longitude: 122.0128, internCount: 8 },
  { name: "Northern Antique Vocational School", type: "SECONDARY", municipality: "Libertad", latitude: 11.6467, longitude: 122.0864, internCount: 7 },
  { name: "Sta. Justa National High School", type: "SECONDARY", municipality: "Culasi", latitude: 11.4247, longitude: 122.0294, internCount: 9 },
  { name: "Laboratory High School", type: "SECONDARY", municipality: "San Jose", latitude: 10.7473, longitude: 121.9319, internCount: 10 },
  { name: "Barbaza National High School", type: "SECONDARY", municipality: "Barbaza", latitude: 11.1425, longitude: 122.0503, internCount: 13 },
  { name: "Laua-an National High School", type: "SECONDARY", municipality: "Laua-an", latitude: 11.1633, longitude: 122.0092, internCount: 8 },
  { name: "Barbaza Central School", type: "ELEMENTARY", municipality: "Barbaza", latitude: 11.1428, longitude: 122.0508, internCount: 7 },
  { name: "Jinalinan-Ipil Elementary School", type: "ELEMENTARY", municipality: "Barbaza", latitude: 11.1502, longitude: 122.0447, internCount: 5 },
  { name: "Malabor Elementary School", type: "ELEMENTARY", municipality: "San Remigio", latitude: 11.0656, longitude: 121.9933, internCount: 6 },
  { name: "Tibiao Central School", type: "ELEMENTARY", municipality: "Tibiao", latitude: 11.2872, longitude: 122.0264, internCount: 7 },
  { name: "Culasi North Elementary School", type: "ELEMENTARY", municipality: "Culasi", latitude: 11.4283, longitude: 122.0316, internCount: 5 },
  { name: "Sebaste Central School", type: "ELEMENTARY", municipality: "Sebaste", latitude: 11.5722, longitude: 122.0741, internCount: 5 },
];

export async function seedSchools() {
  const created: Record<string, string> = {};
  for (const school of SCHOOLS) {
    const row = await prisma.school.upsert({
      where: { id: `seed-${slugify(school.name)}` },
      update: {},
      create: {
        id: `seed-${slugify(school.name)}`,
        name: school.name,
        type: school.type,
        municipality: school.municipality,
        latitude: school.latitude,
        longitude: school.longitude,
        geofenceRadiusMeters: 75,
      },
    });
    created[school.name] = row.id;
  }
  console.log(`[seed] ${SCHOOLS.length} partner schools seeded.`);
  return created;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
