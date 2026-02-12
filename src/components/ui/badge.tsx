import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Priority variants
        "priority-low": 
          "border-transparent bg-priority-low-bg text-priority-low",
        "priority-medium": 
          "border-transparent bg-priority-medium-bg text-priority-medium",
        "priority-high": 
          "border-transparent bg-priority-high-bg text-priority-high",
        "priority-critical": 
          "border-transparent bg-priority-critical-bg text-priority-critical",
        // Status variants
        "status-new": 
          "border-transparent bg-status-new-bg text-status-new",
        "status-in-progress": 
          "border-transparent bg-status-in-progress-bg text-status-in-progress",
        "status-awaiting": 
          "border-transparent bg-status-awaiting-bg text-status-awaiting",
        "status-resolved": 
          "border-transparent bg-status-resolved-bg text-status-resolved",
        "status-closed": 
          "border-transparent bg-status-closed-bg text-status-closed",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
