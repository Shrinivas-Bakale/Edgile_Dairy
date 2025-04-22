import * as React from "react"
import { cn } from "@/lib/utils"

// --------- Type definitions ---------
export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
}

// The trigger displays the selected value and opens the dropdown
export interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string;
  children?: React.ReactNode;
}

// Wraps the selected value display
export interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

// Option item props
export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

interface ComponentWithChildren {
  props: {
    children?: React.ReactNode;
    value?: string;
    disabled?: boolean;
  };
  type: React.ComponentType<any>;
}

// --------- Component implementations ---------

// The trigger button
const SelectTrigger = React.forwardRef<HTMLDivElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="h-4 w-4 opacity-50"
      >
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </div>
  )
);
SelectTrigger.displayName = "SelectTrigger";

// The placeholder or selected value
const SelectValue = React.forwardRef<HTMLSpanElement, SelectValueProps>(
  ({ className, placeholder, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("block truncate", className)}
      {...props}
    >
      {placeholder}
    </span>
  )
);
SelectValue.displayName = "SelectValue";

// These components only serve an organizational purpose
const SelectContent = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
SelectContent.displayName = "SelectContent";

const SelectGroup = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
SelectGroup.displayName = "SelectGroup";

const SelectLabel = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
SelectLabel.displayName = "SelectLabel";

const SelectItem = (_props: SelectItemProps) => null;
SelectItem.displayName = "SelectItem";

// Core select component that manages state
const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ className, onValueChange, value, children, disabled, ...props }, ref) => {
    // Helper to safely extract options
    const extractOptions = () => {
      const options: Array<{value: string, disabled?: boolean, children: React.ReactNode}> = [];
      
      const processChild = (child: React.ReactElement) => {
        if (child.type === SelectItem) {
          options.push({
            value: child.props.value || "",
            disabled: child.props.disabled,
            children: child.props.children
          });
        } else if (child.props && child.props.children) {
          React.Children.forEach(child.props.children, (nestedChild) => {
            if (React.isValidElement(nestedChild)) {
              processChild(nestedChild);
            }
          });
        }
      };
      
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          processChild(child);
        }
      });
      
      return options;
    };
    
    const options = extractOptions();
    
    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
      onValueChange?.(e.target.value);
    }, [onValueChange]);

    // Find trigger component to display it
    let triggerElement = null;
    React.Children.forEach(children, child => {
      if (React.isValidElement(child) && child.type === SelectTrigger) {
        triggerElement = child;
      }
    });

    return (
      <div className={cn("relative", className)} ref={ref}>
        {triggerElement}
        <select
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          {...props}
        >
          {options.map((option, index) => (
            <option key={index} value={option.value} disabled={option.disabled}>
              {option.children}
            </option>
          ))}
        </select>
      </div>
    );
  }
);
Select.displayName = "Select";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
} 