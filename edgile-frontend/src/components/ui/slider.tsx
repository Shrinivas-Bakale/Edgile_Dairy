import * as React from "react"
import { cn } from "@/utils/cn"

interface SliderProps extends React.HTMLAttributes<HTMLInputElement> {
  value?: number[]
  min?: number
  max?: number
  step?: number
  onValueChange?: (value: number[]) => void
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value = [0], min = 0, max = 100, step = 1, onValueChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(e.target.value, 10)
      onValueChange?.([newValue])
    }

    return (
      <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={handleChange}
          className="w-full h-2 appearance-none bg-secondary rounded-full outline-none cursor-pointer"
          {...props}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider } 