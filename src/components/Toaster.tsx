"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[hsl(var(--bg-card))] group-[.toaster]:text-[hsl(var(--text))] group-[.toaster]:border-[hsl(var(--border))] group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-[hsl(var(--text-muted))]",
          actionButton:
            "group-[.toast]:bg-[hsl(var(--primary))] group-[.toast]:text-[hsl(var(--bg))]",
          cancelButton:
            "group-[.toast]:bg-[hsl(var(--bg-hover))] group-[.toast]:text-[hsl(var(--text-muted))]",
        },
      }}
      position="bottom-right"
      theme="dark" // Always dark theme for now since the app seems dark mode focused
    />
  );
}
