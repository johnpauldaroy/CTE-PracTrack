"use client";

import { useState } from "react";
import useSWR from "swr";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { LocationMap } from "@/components/maps/location-map";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

export interface LocationValue {
  latitude: string;
  longitude: string;
  radius: number;
}

interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
}

const searchFetcher = async (url: string) => {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Place search failed.");
  return data as { results: GeocodeResult[] };
};

function parseCoordinate(value: string, limit: number): number | null {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

/**
 * School location picker: search a place, click the map or drag the pin, or
 * use the device's GPS — with the manual latitude/longitude inputs kept as a
 * two-way-bound fallback (PRD: map picker with manual entry fallback). The
 * shaded circle previews the geofence radius. Coordinates are only ever sent
 * to the server, which does the geofence math itself.
 */
export function LocationField({
  value,
  onChange,
  fieldErrors = {},
  idPrefix = "school",
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  fieldErrors?: Record<string, string[] | undefined>;
  idPrefix?: string;
}) {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim(), 600);
  const { data, error, isLoading } = useSWR(
    showResults && debouncedQuery.length >= 3 ? `/api/geocode?q=${encodeURIComponent(debouncedQuery)}` : null,
    searchFetcher,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const latitude = parseCoordinate(value.latitude, 90);
  const longitude = parseCoordinate(value.longitude, 180);

  function setPoint(lat: number, lng: number) {
    onChange({ ...value, latitude: String(lat), longitude: String(lng) });
  }

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("This browser can't share its location.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setPoint(
          Math.round(position.coords.latitude * 10_000_000) / 10_000_000,
          Math.round(position.coords.longitude * 10_000_000) / 10_000_000,
        );
        toast.success(`Location set (accurate to about ${Math.round(position.coords.accuracy)} m).`);
      },
      (geoError) => {
        setIsLocating(false);
        toast.error(geoError.code === geoError.PERMISSION_DENIED ? "Location permission was denied." : "Couldn't get your location.");
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-location-search`}>Location</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            id={`${idPrefix}-location-search`}
            className="pl-8"
            placeholder="Search a school or municipality…"
            value={query}
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setShowResults(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault(); // don't submit the school form
              if (event.key === "Escape") setShowResults(false);
            }}
          />
        </div>
        {showResults && debouncedQuery.length >= 3 && (
          <div className="rounded-lg border bg-popover text-sm shadow-sm" role="listbox" aria-label="Search results">
            {isLoading && <p className="p-3 text-muted-foreground">Searching…</p>}
            {error && <p className="p-3 text-destructive">{error.message}</p>}
            {data && !data.results.length && <p className="p-3 text-muted-foreground">No places found. Try the municipality name.</p>}
            {data?.results.map((result) => (
              <button
                key={`${result.latitude},${result.longitude}`}
                type="button"
                role="option"
                aria-selected={false}
                className="flex w-full items-start gap-2 border-b p-3 text-left last:border-b-0 hover:bg-muted"
                onClick={() => {
                  setPoint(result.latitude, result.longitude);
                  setShowResults(false);
                }}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>{result.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-64 overflow-hidden rounded-lg border">
        <LocationMap
          latitude={latitude}
          longitude={longitude}
          radiusMeters={value.radius}
          onPick={setPoint}
          className="h-full w-full"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Click the map or drag the pin. The shaded circle is the geofence.</p>
        <Button type="button" variant="outline" size="sm" onClick={useCurrentLocation} disabled={isLocating}>
          <LocateFixed /> {isLocating ? "Locating…" : "Use my current location"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-lat`}>Latitude</Label>
          <Input
            id={`${idPrefix}-lat`}
            required
            type="number"
            step="any"
            min={-90}
            max={90}
            placeholder="11.0413"
            value={value.latitude}
            onChange={(event) => onChange({ ...value, latitude: event.target.value })}
            aria-invalid={!!fieldErrors.latitude}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-lng`}>Longitude</Label>
          <Input
            id={`${idPrefix}-lng`}
            required
            type="number"
            step="any"
            min={-180}
            max={180}
            placeholder="122.0831"
            value={value.longitude}
            onChange={(event) => onChange({ ...value, longitude: event.target.value })}
            aria-invalid={!!fieldErrors.longitude}
          />
        </div>
      </div>
      {(fieldErrors.latitude || fieldErrors.longitude) && (
        <p className="text-xs text-destructive">Enter valid coordinates.</p>
      )}

      <div className="flex flex-col gap-3">
        <Label id={`${idPrefix}-radius-label`}>Geofence Radius: {value.radius}m</Label>
        <Slider
          aria-labelledby={`${idPrefix}-radius-label`}
          min={10}
          max={300}
          step={5}
          value={[value.radius]}
          onValueChange={(next) => onChange({ ...value, radius: Array.isArray(next) ? next[0] : next })}
        />
        {fieldErrors.geofenceRadiusMeters && (
          <p className="text-xs text-destructive">{fieldErrors.geofenceRadiusMeters[0]}</p>
        )}
      </div>
    </div>
  );
}
