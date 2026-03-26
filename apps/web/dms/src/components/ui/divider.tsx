import { cn } from "@/lib/utils";

interface DividerProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function Divider({ className, orientation = "horizontal" }: DividerProps) {
  return (
    <div
      className={cn(
        "bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
    />
  );
}

// Alias
export const Separator = Divider;
