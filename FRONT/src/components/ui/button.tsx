import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500",
        secondary:
          "bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500",
        outline:
          "border border-gray-300 bg-transparent text-slate-900 hover:bg-gray-50 dark:border-slate-500 dark:text-slate-100 dark:hover:bg-slate-700/70",
        ghost:
          "text-slate-900 hover:bg-gray-100 dark:text-slate-100 dark:hover:bg-slate-700/60",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  )
)
Button.displayName = "Button"

export { Button, buttonVariants }
