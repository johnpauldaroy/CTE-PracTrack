"use client";

import { useState } from "react";
import useSWR from "swr";
import type { ShiftingOption } from "@/components/shifting-tabs";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/** Recent shiftings plus the selected one (defaults to the active shifting) for per-intern tabs. */
export function useShiftingSelection() {
  const { data } = useSWR<{ shiftings: ShiftingOption[] }>("/api/shiftings/recent", fetcher);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const shiftings = data?.shiftings ?? [];
  const fallback = shiftings.find((shifting) => shifting.status === "ACTIVE") ?? shiftings[0];
  const shiftingId =
    selectedId && shiftings.some((shifting) => shifting.id === selectedId) ? selectedId : (fallback?.id ?? null);
  return { shiftings, shiftingId, setShiftingId: setSelectedId, isLoading: !data };
}
