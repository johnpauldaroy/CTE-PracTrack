"use client";

import dynamic from "next/dynamic";
import type { LeafletMapProps } from "@/components/maps/leaflet-map";
import { Skeleton } from "@/components/ui/skeleton";

/** Client-only Leaflet map (Leaflet needs `window`, so it's never server-rendered). */
export const LocationMap = dynamic<LeafletMapProps>(() => import("@/components/maps/leaflet-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});
