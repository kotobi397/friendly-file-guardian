
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-extrabold ring-offset-background transition-all active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-2 border-clash-gold-deep bg-clash-gold text-clash-bubble-foreground shadow-[0_3px_0_hsl(var(--clash-gold-deep))] hover:brightness-105",
        destructive:
          "border-2 border-destructive/70 bg-destructive text-destructive-foreground shadow-[0_3px_0_hsl(var(--clash-panel-deep))] hover:brightness-105",
        outline:
          "border-2 border-clash-gold-deep/70 bg-card text-foreground shadow-[0_3px_0_hsl(var(--clash-gold-deep)/0.5)] hover:bg-accent",
        secondary:
          "border-2 border-clash-gold-deep/60 bg-secondary text-secondary-foreground shadow-[0_3px_0_hsl(var(--clash-gold-deep)/0.4)] hover:brightness-105",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "border-2 border-clash-gold-deep bg-gradient-to-b from-clash-gold to-clash-gold-deep text-clash-bubble-foreground shadow-[0_3px_0_hsl(var(--clash-panel-deep))]",
        book:
          "border-2 border-clash-gold-deep bg-clash-panel text-clash-foreground shadow-[0_3px_0_hsl(var(--clash-panel-deep))]",
        navigation:
          "border-2 border-clash-gold-deep/70 bg-card/90 text-foreground backdrop-blur-sm shadow-[0_3px_0_hsl(var(--clash-gold-deep)/0.5)] hover:bg-card",
      },

      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
        pagination: "h-12 w-12 rounded-full",
      },
      animation: {
        none: "",
        pulse: "animate-pulse",
        scale: "transform hover:scale-105 active:scale-95 transition-transform duration-200",
        slide: "transform hover:-translate-y-1 transition-transform duration-200",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "none",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean,
  animation?: "none" | "pulse" | "scale" | "slide"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, animation, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, animation, className }))}
        ref={ref}
        type={type}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
