import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  rounded?: "md" | "lg" | "full";
};

const roundedClass = {
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export function Skeleton({
  className = "",
  rounded = "md",
  ...rest
}: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-zinc-200 dark:bg-zinc-800 ${roundedClass[rounded]} ${className}`}
      aria-hidden
      {...rest}
    />
  );
}
