/**
 * A simple toast utility for displaying notifications
 */

interface ToastOptions {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

/**
 * Simple toast function that logs to console for now
 */
export const simpleToast = (options: ToastOptions): void => {
  // Log for debugging
  console.log(`TOAST: ${options.variant || 'default'} - ${options.title}: ${options.description}`);
  
  // In a real implementation, this would show an actual toast notification
  // For now, just logging for simplicity
};

export default simpleToast; 