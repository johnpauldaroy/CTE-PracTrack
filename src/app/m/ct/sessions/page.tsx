"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SessionList, type SessionRow } from "@/components/mobile/session-list";
export default function CtSessionsPage() { return <div className="flex flex-col gap-4 p-4"><div className="flex items-center justify-between"><h1 className="font-heading text-xl font-bold">Sessions</h1><Button size="sm" render={<Link href="/m/ct/sessions/new" />}>Assign</Button></div><SessionList showIntern actions={(session: SessionRow) => session.status === "ASSIGNED" ? <Button className="mt-3 w-full" size="sm" render={<Link href={`/m/ct/sessions/${session.id}/evaluate`} />}>Evaluate</Button> : null} /></div>; }
