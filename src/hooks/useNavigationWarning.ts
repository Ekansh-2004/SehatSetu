import { useCallback, useEffect, useRef } from 'react';

interface UseNavigationWarningOptions {
  /**
   * Function that returns true if navigation should be blocked
   */
  shouldWarn: () => boolean;
  /**
   * Custom warning message to display
   */
  message?: string;
  /**
   * Whether the warning is enabled
   */
  enabled?: boolean;
  /**
   * Custom confirmation function that returns a Promise<boolean>
   * If not provided, falls back to window.confirm()
   */
  onConfirm?: (message: string) => Promise<boolean>;
}

let isNavigatingProgrammatically = false;

export const setNavigatingProgrammatically = (value: boolean) => {
  isNavigatingProgrammatically = value;
  
  if (value) {
    setTimeout(() => {
      isNavigatingProgrammatically = false;
    }, 1000);
  }
};

/**
 * Custom hook to handle navigation warnings for unsaved changes or active sessions
 * 
 * @param options Configuration options for the navigation warning
 * 
 * @example
 * ```tsx
 * const hasUnsavedChanges = () => formDirty || recordingActive;
 * 
 * useNavigationWarning({
 *   shouldWarn: hasUnsavedChanges,
 *   message: 'You have unsaved changes. Are you sure you want to leave?',
 *   enabled: true
 * });
 * ```
 */
export const useNavigationWarning = ({
  shouldWarn,
  message = 'You have unsaved changes. Are you sure you want to leave?',
  enabled = true,
  onConfirm
}: UseNavigationWarningOptions) => {
  
  // Memoize the warning check function
  const checkShouldWarn = useCallback(() => {
    return enabled && shouldWarn();
  }, [enabled, shouldWarn]);

  // Track navigation state to prevent multiple dialogs
  const isShowingDialogRef = useRef(false);
  const navigationBlockedRef = useRef(false);

  useEffect(() => {
    // Skip if not enabled or not in browser environment
    if (!enabled || typeof window === 'undefined') return;

    // Handle SPA navigation (back/forward buttons)
    const handlePopState = async (e: PopStateEvent) => {
      // Skip if no warning needed or already showing dialog
      if (!checkShouldWarn() || isShowingDialogRef.current) return;
      
      // Mark that we're showing a dialog to prevent multiple instances
      isShowingDialogRef.current = true;
      
      try {
        const shouldLeave = onConfirm 
          ? await onConfirm(message)
          : window.confirm(message);
          
        if (shouldLeave) {
          // User confirmed - allow navigation
          navigationBlockedRef.current = false;
          isShowingDialogRef.current = false;
          
          // Navigate back without triggering our handler again
          window.removeEventListener('popstate', handlePopState);
          window.history.back();
          
          // Re-add listener after navigation
          setTimeout(() => {
            window.addEventListener('popstate', handlePopState);
          }, 100);
        } else {
          // User cancelled - block navigation by pushing current state
          isShowingDialogRef.current = false;
          window.history.pushState(null, '', window.location.href);
        }
      } catch (error) {
        console.error('Error in navigation confirmation:', error);
        // On error, block navigation
        isShowingDialogRef.current = false;
        window.history.pushState(null, '', window.location.href);
      }
    };

    // Handle page unload (refresh, close tab, external navigation)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isNavigatingProgrammatically || !checkShouldWarn()) return;
      
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    // Setup event listeners
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Push initial state to enable popstate detection
    // Only push if we haven't already pushed a state
    if (!window.history.state || !window.history.state.navigationWarning) {
      window.history.pushState({ navigationWarning: true }, '', window.location.href);
    }
    
    // Cleanup function
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      }
    };
  }, [checkShouldWarn, message, enabled, onConfirm]);
};

export default useNavigationWarning;
