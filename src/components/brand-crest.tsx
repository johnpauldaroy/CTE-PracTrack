import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";

export function BrandCrest({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground",
        className,
      )}
    >
      <BookOpen className="size-6" strokeWidth={2.25} />
    </div>
  );
}
