"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface AddSchoolSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

type SchoolType = "SECONDARY" | "ELEMENTARY";

export function AddSchoolSheet({ open, onOpenChange, onCreated }: AddSchoolSheetProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<SchoolType>("SECONDARY");
  const [municipality, setMunicipality] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState(75);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setName("");
    setType("SECONDARY");
    setMunicipality("");
    setLatitude("");
    setLongitude("");
    setRadius(75);
    setFieldErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type,
          municipality,
          latitude: Number(latitude),
          longitude: Number(longitude),
          geofenceRadiusMeters: radius,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        toast.error(data.error ?? "Could not add school.");
        return;
      }
      toast.success(`${name} added.`);
      reset();
      onOpenChange(false);
      onCreated();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add School</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="school-name">School Name</Label>
            <Input
              id="school-name"
              required
              placeholder="e.g. San Antonio National High School"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(["SECONDARY", "ELEMENTARY"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-md py-2 text-sm font-medium capitalize transition-colors",
                    type === t ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
                  )}
                >
                  {t.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="school-municipality">Municipality</Label>
            <Input
              id="school-municipality"
              required
              placeholder="e.g. Hamtic"
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
            />
            {fieldErrors.municipality && (
              <p className="text-xs text-destructive">{fieldErrors.municipality[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/50 p-6 text-center text-sm text-muted-foreground">
            <MapPin className="mx-auto size-6" />
            <p>Search a municipality or enter coordinates below.</p>
            <p className="text-xs">(Interactive map picker not yet wired up — use manual entry.)</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="school-lat">Latitude</Label>
              <Input
                id="school-lat"
                required
                type="number"
                step="any"
                placeholder="11.0413"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="school-lng">Longitude</Label>
              <Input
                id="school-lng"
                required
                type="number"
                step="any"
                placeholder="122.0831"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>
          {(fieldErrors.latitude || fieldErrors.longitude) && (
            <p className="text-xs text-destructive">Enter valid coordinates.</p>
          )}

          <div className="flex flex-col gap-3">
            <Label>Geofence Radius: {radius}m</Label>
            <Slider
              min={10}
              max={300}
              step={5}
              value={[radius]}
              onValueChange={(v) => setRadius(Array.isArray(v) ? v[0] : v)}
            />
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Adding…" : "Add School"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
