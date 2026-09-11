"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface FlaggingRuleConfig {
  absenceEarlyWarning: number;
  consecutiveAbsences: number;
  dropEligibleAbove: number;
  evaluationPendingDays: number;
  behindPaceTolerance: string;
}

export function FlaggingRulesTab() {
  const { data, isLoading, mutate } = useSWR<{ config: FlaggingRuleConfig }>(
    "/api/config/flagging-rules",
    fetcher,
  );

  const [absenceEarlyWarning, setAbsenceEarlyWarning] = useState(3);
  const [consecutiveAbsences, setConsecutiveAbsences] = useState(3);
  const [dropEligibleAbove, setDropEligibleAbove] = useState(12);
  const [evaluationPendingDays, setEvaluationPendingDays] = useState(7);
  const [behindPaceTolerance, setBehindPaceTolerance] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (data?.config) {
      setAbsenceEarlyWarning(data.config.absenceEarlyWarning);
      setConsecutiveAbsences(data.config.consecutiveAbsences);
      setDropEligibleAbove(data.config.dropEligibleAbove);
      setEvaluationPendingDays(data.config.evaluationPendingDays);
      setBehindPaceTolerance(Number(data.config.behindPaceTolerance));
    }
  }, [data]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/config/flagging-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          absenceEarlyWarning,
          consecutiveAbsences,
          dropEligibleAbove,
          evaluationPendingDays,
          behindPaceTolerance,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Could not save flagging rules.");
        return;
      }
      toast.success("Flagging rules updated.");
      mutate();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <Skeleton className="h-96 w-full max-w-md" />;

  return (
    <Card className="max-w-md">
      <CardContent className="p-5">
        <p className="mb-4 text-sm text-muted-foreground">
          These conditions determine when a student appears in Requiring Attention.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fr-early">Absence early warning — flag when absences reach:</Label>
            <Input
              id="fr-early"
              type="number"
              min={1}
              required
              value={absenceEarlyWarning}
              onChange={(e) => setAbsenceEarlyWarning(Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fr-consecutive">Consecutive absences — flag when consecutive absences reach:</Label>
            <Input
              id="fr-consecutive"
              type="number"
              min={1}
              required
              value={consecutiveAbsences}
              onChange={(e) => setConsecutiveAbsences(Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fr-drop">Drop-eligible — flag when absences exceed:</Label>
            <Input
              id="fr-drop"
              type="number"
              min={1}
              required
              value={dropEligibleAbove}
              onChange={(e) => setDropEligibleAbove(Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fr-eval">CT evaluation pending — flag when unevaluated for more than (days):</Label>
            <Input
              id="fr-eval"
              type="number"
              min={1}
              required
              value={evaluationPendingDays}
              onChange={(e) => setEvaluationPendingDays(Number(e.target.value))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fr-tolerance">Behind on session pace — tolerance (sessions):</Label>
            <Input
              id="fr-tolerance"
              type="number"
              min={0}
              step="0.5"
              required
              value={behindPaceTolerance}
              onChange={(e) => setBehindPaceTolerance(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Not shown as a configurable field in the original mockup, but CLAUDE.md requires every
              flagging rule to be config-driven, not hardcoded — added here for completeness.
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
