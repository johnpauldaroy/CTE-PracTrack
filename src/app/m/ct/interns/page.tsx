"use client";
import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";
const fetcher = (url: string) => fetch(url).then((res) => res.json());
export default function CtInternsPage() { const { data, isLoading } = useSWR<{ interns: { id: string; schoolNumber: string; course: string; yearLevel: string; user: { name: string; email: string } }[] }>("/api/ct/interns", fetcher); return <div className="flex flex-col gap-4 p-4"><h1 className="font-heading text-xl font-bold">My Interns</h1>{isLoading ? <Skeleton className="h-32" /> : data?.interns.map((intern) => <article key={intern.id} className="rounded-xl border bg-card p-4"><p className="font-semibold">{intern.user.name}</p><p className="text-sm text-muted-foreground">{intern.schoolNumber} · {intern.course} · {intern.yearLevel}</p><p className="text-xs text-muted-foreground">{intern.user.email}</p></article>)}</div>; }
