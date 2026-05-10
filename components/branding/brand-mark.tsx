import { APP_NAME } from "@/lib/app-config";

type BrandMarkProps = {
  size?: "sm" | "md";
  className?: string;
  iconOnly?: boolean;
};

const sizeStyles = {
  sm: {
    glyph: "h-7 w-7 rounded-md",
    icon: "h-4 w-4",
    label: "text-base font-semibold tracking-tight",
    gap: "gap-2",
  },
  md: {
    glyph: "h-9 w-9 rounded-lg",
    icon: "h-5 w-5",
    label: "text-lg font-semibold tracking-tight",
    gap: "gap-2.5",
  },
} as const;

export function BrandMark({
  size = "sm",
  className,
  iconOnly = false,
}: BrandMarkProps) {
  const s = sizeStyles[size];

  return (
    <span
      className={`inline-flex items-center ${s.gap} ${className ?? ""}`}
      aria-label={iconOnly ? APP_NAME : undefined}
    >
      <span
        className={`relative inline-flex items-center justify-center ${s.glyph} bg-linear-to-br from-emerald-500 to-teal-500 text-white shadow-sm ring-1 ring-emerald-600/20`}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={s.icon}
        >
          <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6.5A1.5 1.5 0 0 1 5 19.5v-15Z" />
          <path d="M5 8h2" />
          <path d="M5 12h2" />
          <path d="M5 16h2" />
          <path d="M11 8.5h5" />
          <path d="M11 12h5" />
        </svg>
      </span>
      {!iconOnly && (
        <span className={`${s.label} text-zinc-900 dark:text-zinc-50`}>
          {APP_NAME}
        </span>
      )}
    </span>
  );
}
