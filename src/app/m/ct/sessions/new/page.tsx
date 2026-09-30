"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const fetcher = (url: string) => fetch(url).then((res) => res.json());
export default function AssignSessionPage() {
  const router = useRouter(); const { data } = useSWR<{ interns: { id: string; user: { name: string } }[] }>("/api/ct/interns", fetcher); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget); const response = await fetch("/api/sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); const result = await response.json(); setBusy(false); if (!response.ok) return setError(result.error ?? "Unable to assign session."); router.push("/m/ct/sessions"); router.refresh(); }
  return <form onSubmit={submit} className="flex flex-col gap-4 p-4"><h1 className="font-heading text-xl font-bold">Assign Session</h1><Field label="Intern"><select name="internId" required className="h-9 w-full rounded-lg border bg-background px-3 text-sm"><option value="">Select intern</option>{data?.interns.map((intern) => <option key={intern.id} value={intern.id}>{intern.user.name}</option>)}</select></Field><Field label="Date"><Input name="date" type="date" required /></Field><Field label="Subject"><Input name="subject" required /></Field><Field label="Grade & Section"><Input name="gradeSection" required /></Field><Field label="Topic"><Input name="topic" required /></Field><Field label="Session Type"><select name="type" className="h-9 w-full rounded-lg border bg-background px-3 text-sm"><option value="REGULAR">Regular Teaching</option><option value="FINAL_DEMO">Final Demo</option></select></Field>{error && <p className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy}>{busy ? "Assigning…" : "Assign Session"}</Button></form>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="grid gap-2"><Label>{label}</Label>{children}</div>; }
