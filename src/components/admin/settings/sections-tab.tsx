"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SectionRow {
  id: string;
  name: string;
  course: string;
  yearLevel: string;
  isActive: boolean;
  _count: { interns: number };
}

/** The class sections interns pick from when they register. A section implies the course and year level. */
export function SectionsTab() {
  const { data, isLoading, mutate } = useSWR<{ sections: SectionRow[] }>("/api/sections", fetcher);
  const [form, setForm] = useState({ name: "", course: "", yearLevel: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setSaving(true);
    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      if (!res.ok) {
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        toast.error(result.error ?? "Could not add the section.");
        return;
      }
      toast.success("Section added.");
      setForm({ name: "", course: "", yearLevel: "" });
      mutate();
    } finally {
      setSaving(false);
    }
  }

  async function toggle(section: SectionRow) {
    const res = await fetch(`/api/sections/${section.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: section.name, course: section.course, yearLevel: section.yearLevel, isActive: !section.isActive }),
    });
    if (!res.ok) {
      toast.error("Could not update the section.");
      return;
    }
    mutate();
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card>
        <CardContent className="p-5">
          <p className="mb-4 text-sm text-muted-foreground">
            Interns choose their section from this list when they register. Deactivate a section to hide it from the list;
            interns already in it are kept.
          </p>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-4 sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sec-name">Section</Label>
              <Input id="sec-name" required placeholder="BSEd-ENG 4A" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sec-course">Course</Label>
              <Input
                id="sec-course"
                required
                list="sec-course-options"
                placeholder="BSEd-English"
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
              />
              {/* Courses already used by a section are suggested so the same course is spelled the same way. */}
              <datalist id="sec-course-options">
                {[...new Set((data?.sections ?? []).map((section) => section.course))].map((course) => (
                  <option key={course} value={course} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sec-year">Year level</Label>
              <select
                id="sec-year"
                required
                value={form.yearLevel}
                onChange={(e) => setForm({ ...form, yearLevel: e.target.value })}
                className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
              >
                <option value="">Select...</option>
                {YEAR_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={saving}>
              <Plus /> {saving ? "Adding…" : "Add"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Year level</TableHead>
                <TableHead>Interns</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.sections.map((section) => (
                <TableRow key={section.id}>
                  <TableCell className="font-medium">{section.name}</TableCell>
                  <TableCell>{section.course}</TableCell>
                  <TableCell>{section.yearLevel}</TableCell>
                  <TableCell>{section._count.interns}</TableCell>
                  <TableCell className="text-right">
                    <Button variant={section.isActive ? "outline" : "secondary"} size="sm" onClick={() => toggle(section)}>
                      {section.isActive ? "Active · Deactivate" : "Inactive · Activate"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data?.sections.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No sections yet. Interns cannot register until you add at least one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
