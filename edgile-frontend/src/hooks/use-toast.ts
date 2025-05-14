import { useState, useCallback } from 'react';
import { Toast } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export { useToast, Toast }

export type ToastProps = React.ComponentProps<typeof Toast>

interface ToastOptions {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

interface ToastState {
  open: boolean;
  options: ToastOptions | null;
}

export const useToast = () => {
  const [state, setState] = useState<ToastState>({
    open: false,
    options: null,
  });

  const toast = useCallback((options: ToastOptions) => {
    setState({ open: true, options });
    
    // Auto dismiss after duration
    setTimeout(() => {
      setState((prev) => ({ ...prev, open: false }));
    }, options.duration || 3000);
    
    // Log for debugging
    console.log(`TOAST: ${options.variant || 'default'} - ${options.title}: ${options.description}`);
  }, []);

  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    toast,
    dismiss,
    ...state,
  };
};

// Simple toast function for direct import
export const toast = (options: ToastOptions): void => {
  // Log for debugging
  console.log(`TOAST: ${options.variant || 'default'} - ${options.title}: ${options.description}`);
  
  // For a real implementation this would show an actual toast notification
  // Currently just logging for simplicity
};

export default toast; 