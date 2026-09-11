"use client";

import useSWR from "swr";

export interface SchoolListItem {
  id: string;
  name: string;
  type: "SECONDARY" | "ELEMENTARY";
  municipality: string;
  supervisorProfile: { user: { name: string } } | null;
  _count: { interns: number };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useSchools() {
  const { data, error, isLoading, mutate } = useSWR<{ schools: SchoolListItem[] }>(
    "/api/schools",
    fetcher,
  );
  return { schools: data?.schools ?? [], error, isLoading, mutate };
}
