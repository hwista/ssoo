import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: 네이비 블루 - CUD/중요 작업
        default:
          "bg-ssoo-primary text-white shadow hover:bg-ssoo-primary-hover",
        // Secondary: 보조색 - 일반 작업
        secondary:
          "bg-ssoo-secondary text-white shadow-sm hover:bg-ssoo-primary",
        // Outline: 테두리만
        outline:
          "border border-ssoo-content-border bg-white text-ssoo-primary shadow-sm hover:bg-ssoo-sitemap-bg",
        // Destructive: 삭제/위험 (LS Red)
        destructive:
          "bg-ls-red text-white shadow-sm hover:bg-ls-red-hover",
        // Ghost: 배경 없음
        ghost: "text-ssoo-primary hover:bg-ssoo-content-bg",
        // Link: 링크 스타일
        link: "text-ssoo-sitemap-title underline-offset-4 hover:underline",
      },
      size: {
        // 표준 높이: 36px (h-control-h)
        default: "h-control-h px-4 py-2",
        sm: "h-control-h-sm px-3 text-xs",
        lg: "h-control-h-lg px-6 text-base",
        icon: "h-control-h w-control-h",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
