import * as React from "react"
import { cn } from "@/utils/cn"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <div
        className="h-full w-full bg-primary transition-all"
        style={{ 
          width: `${value}%`,
          maxWidth: '100%'
        }}
      />
    </div>
  )
)
Progress.displayName = "Progress"

export { Progress } 