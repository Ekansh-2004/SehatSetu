"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface NavigationWarningState {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Global state for the navigation warning dialog
let navigationWarningState: NavigationWarningState | null = null;
let setNavigationWarningState: ((state: NavigationWarningState | null) => void) | null = null;
let isDialogOpen = false;

/**
 * Show navigation warning dialog
 * @param message Warning message to display
 * @returns Promise that resolves to true if user confirms, false if cancelled
 */
export const showNavigationWarning = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Prevent multiple dialogs from opening
    if (isDialogOpen) {
      resolve(false);
      return;
    }

    if (!setNavigationWarningState) {
      // Fallback to window.confirm if dialog not available
      resolve(window.confirm(message));
      return;
    }

    isDialogOpen = true;

    setNavigationWarningState({
      isOpen: true,
      message,
      onConfirm: () => {
        isDialogOpen = false;
        setNavigationWarningState?.(null);
        resolve(true);
      },
      onCancel: () => {
        isDialogOpen = false;
        setNavigationWarningState?.(null);
        resolve(false);
      }
    });
  });
};

/**
 * Navigation Warning Dialog Component
 * This should be placed at the root level of your app or page
 */
export const NavigationWarningDialog = () => {
  const [state, setState] = useState<NavigationWarningState | null>(null);

  useEffect(() => {
    // Register the state setter globally
    setNavigationWarningState = setState;
    navigationWarningState = state;

    return () => {
      // Cleanup on unmount
      setNavigationWarningState = null;
      navigationWarningState = null;
    };
  }, [state]);

  if (!state) return null;

  return (
    <Dialog 
      open={state.isOpen} 
      onOpenChange={(open) => {
        // Only allow closing via the buttons, not by clicking outside or ESC
        if (!open) {
          state.onCancel();
        }
      }}
    >
      <DialogContent 
        className="sm:max-w-md"
        onEscapeKeyDown={(e) => {
          // Prevent closing with ESC key
          e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          // Prevent closing by clicking outside
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Active Session Warning
          </DialogTitle>
          <DialogDescription className="text-base">
            {state.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            variant="outline"
            onClick={state.onCancel}
            className="w-full sm:w-auto"
          >
            Stay on Page
          </Button>
          <Button
            variant="destructive"
            onClick={state.onConfirm}
            className="w-full sm:w-auto"
          >
            Leave Page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NavigationWarningDialog;
