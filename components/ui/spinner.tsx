type SpinnerProps = {
  className?: string;
  label?: string;
  /**
   * `default`: dark-on-light spinner for use on neutral backgrounds.
   * `contrast`: pairs with the primary button (`bg-zinc-900` light /
   * `bg-zinc-100` dark) so the spinner remains legible on filled CTAs.
   */
  variant?: "default" | "contrast";
};

const variantStyles = {
  default:
    "border-zinc-300 border-t-zinc-700 dark:border-zinc-600 dark:border-t-zinc-200",
  contrast:
    "border-white/30 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900",
} as const;

export function Spinner({
  className = "",
  label,
  variant = "default",
}: SpinnerProps) {
  return (
    <span
      className={`inline-block size-4 animate-spin rounded-full border-2 ${variantStyles[variant]} ${className}`}
      role={label ? "status" : "presentation"}
      aria-label={label}
    >
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
