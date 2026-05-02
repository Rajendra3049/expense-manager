type SpinnerProps = {
  className?: string;
  label?: string;
};

export function Spinner({ className = "", label }: SpinnerProps) {
  return (
    <span
      className={`inline-block size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-600 dark:border-t-zinc-200 ${className}`}
      role={label ? "status" : "presentation"}
      aria-label={label}
    >
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
