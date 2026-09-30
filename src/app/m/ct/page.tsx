import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SessionList } from "@/components/mobile/session-list";
export default function CtHomePage() { return <div className="flex flex-col gap-4 p-4"><div><h1 className="font-heading text-2xl font-bold">Cooperating Teacher</h1><p className="text-sm text-muted-foreground">Assign sessions and submit evaluations for your interns.</p></div><Button render={<Link href="/m/ct/sessions/new" />}>Assign Session</Button><h2 className="font-semibold">Recent sessions</h2><SessionList showIntern /></div>; }
