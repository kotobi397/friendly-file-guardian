import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-xl border-2 px-2.5 py-0.5 text-xs font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-clash-gold-deep bg-clash-gold text-clash-bubble-foreground",
        secondary:
          "border-clash-gold-deep/50 bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/60 bg-destructive text-destructive-foreground",
        outline: "border-clash-gold-deep/60 text-foreground",
      },

    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
