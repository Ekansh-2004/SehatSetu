"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BlurredBackdropProps extends React.HTMLAttributes<HTMLDivElement> {
  show?: boolean;
  onClose?: () => void;
}

const BlurredBackdrop = React.forwardRef<HTMLDivElement, BlurredBackdropProps>(
  ({ className, show = true, onClose, ...props }, ref) => {
    if (!show) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 bg-black/10 backdrop-blur-sm backdrop-saturate-200",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:backdrop-blur-none data-[state=open]:backdrop-blur-sm",
          className
        )}
        onClick={onClose}
        {...props}
      />
    );
  }
);
BlurredBackdrop.displayName = "BlurredBackdrop";

export { BlurredBackdrop };
