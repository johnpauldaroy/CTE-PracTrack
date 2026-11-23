/**
 * Course, year level and section letter are stored separately; the label interns and staff see
 * ("BSED-MATH 4A") is always built here. One implementation: do not concatenate these by hand.
 */
export const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"] as const;

/** "4th Year" -> "4". Falls back to the raw text for values that do not start with a digit. */
export function yearNumber(yearLevel: string): string {
  return /^\s*(\d)/.exec(yearLevel)?.[1] ?? yearLevel.trim();
}

/** "BSED - math" -> "BSED-MATH": one spelling per course, whoever types it. */
export function normalizeCourse(course: string): string {
  return course.trim().replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").toUpperCase();
}

export function sectionLabel(section: { course: string; yearLevel: string; name: string }): string {
  return `${section.course} ${yearNumber(section.yearLevel)}${section.name}`;
}
