import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';
import { AlertCircle } from 'lucide-react';

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  disabled?: boolean;
  placeholder?: string;
  tooltip?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  value,
  onChange,
  options,
  disabled,
  placeholder,
  tooltip,
  error,
  required = false,
  className = ''
}) => {
  // Find the selected option's label
  const selectedLabel = options.find(option => option.value === value)?.label || '';

  return (
    <div className={className}>
      <Label htmlFor={label.toLowerCase()} className="flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
        {tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-4 w-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>{tooltip}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </Label>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger 
          id={label.toLowerCase()} 
          className={`w-full ${error ? 'border-red-500' : ''}`}
          aria-label={label}
        >
          <SelectValue>
            {value ? selectedLabel : placeholder || `Select ${label}`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="">Select {label}</SelectItem>
            {options.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value} 
                disabled={option.disabled}
                className={option.disabled ? 'opacity-60 text-gray-500' : ''}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}; 