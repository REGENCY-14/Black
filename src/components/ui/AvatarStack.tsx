import { cn } from "@/lib/cn";

export interface AvatarPerson {
  name: string;
  src?: string;
}

const tones = [
  "bg-info-soft text-info",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
  "bg-danger-soft text-danger",
];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

interface AvatarStackProps {
  people: AvatarPerson[];
  /** Max avatars shown before the +N chip. */
  max?: number;
  /** Total count when it is larger than `people` (for example 27 preorders). */
  total?: number;
  className?: string;
}

/** Overlapping avatars with a "+N" overflow chip (reference 2). */
export function AvatarStack({ people, max = 4, total, className }: AvatarStackProps) {
  const shown = people.slice(0, max);
  const extra = (total ?? people.length) - shown.length;
  const ring = "ring-2 ring-card";
  return (
    <div
      className={cn("flex items-center", className)}
      role="img"
      aria-label={`${total ?? people.length} people`}
    >
      {shown.map((p, i) => (
        <span
          key={p.name + i}
          title={p.name}
          className={cn(
            "-ml-2 inline-flex size-9 items-center justify-center overflow-hidden rounded-pill text-xs font-semibold first:ml-0",
            ring,
            tones[i % tones.length],
          )}
        >
          {p.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.src} alt="" className="size-full object-cover" />
          ) : (
            initials(p.name)
          )}
        </span>
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "-ml-2 inline-flex h-9 min-w-9 items-center justify-center rounded-pill bg-subtle px-2 text-xs font-medium text-fg-secondary",
            ring,
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
