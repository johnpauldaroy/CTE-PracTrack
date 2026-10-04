"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Runs the at-risk rules now instead of waiting for the daily run. */
export function EvaluateAlertsButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const response = await fetch("/api/alerts", { method: "POST" });
      if (!response.ok) {
        toast.error("Unable to evaluate alerts.");
        return;
      }
      const { result } = await response.json();
      toast.success(result.raised ? `${result.raised} new alert(s) raised.` : "Rules evaluated — no new alerts.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={busy}>
      <RefreshCw className={busy ? "animate-spin" : undefined} /> {busy ? "Checking…" : "Re-evaluate now"}
    </Button>
  );
}
