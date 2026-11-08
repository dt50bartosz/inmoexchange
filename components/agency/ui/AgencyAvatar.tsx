import { initials } from "../utils";

const SIZES = {
  sm: "h-10 w-10 text-sm",
  md: "h-14 w-14 text-lg",
  lg: "h-24 w-24 text-2xl",
};

type Props = {
  logoUrl: string | null;
  name: string;
  size?: keyof typeof SIZES;
  alt?: string;
};

export default function AgencyAvatar({ logoUrl, name, size = "md", alt = "" }: Props) {
  return (
    <div
      className={`flex ${SIZES[size]} shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted`}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={alt} className="h-full w-full object-contain p-1" />
      ) : (
        <span className="font-semibold text-muted-foreground">{initials(name)}</span>
      )}
    </div>
  );
}
