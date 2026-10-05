"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * The signed-in account's own profile photo URL (null when none is set). Every
 * caller shares one cache entry, so an upload on the profile screen updates the
 * header avatar too. The URL is signed for an hour; refresh it before it expires.
 */
export function useProfilePhoto() {
  const { data, mutate } = useSWR<{ url: string | null }>("/api/me/avatar", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 50 * 60 * 1000,
  });
  return { url: data?.url ?? null, mutate };
}
