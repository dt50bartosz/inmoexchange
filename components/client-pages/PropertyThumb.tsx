import type { Property } from "@/types/client-pages";
import { cn } from "../crm/utils";

export function PropertyThumb({ property, className }: { property: Property; className?: string }) {
  if (property.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={property.image} alt="" className={cn("rounded-md object-cover", className)} />;
  }
  return (
    <div
      aria-hidden
      className={cn("flex items-end rounded-md bg-muted p-1.5 text-[10px] leading-none text-muted-foreground", className)}
    >
      {property.type}
    </div>
  );
}
