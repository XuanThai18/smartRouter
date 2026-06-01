"use client";
import { toast as sonnerToast } from "sonner";

type ToastType = "success" | "error" | "warning" | "info";

export const useToast = () => {
  return {
    toast: (type: ToastType, title: string, message?: string) => {
      const opts = message ? { description: message } : undefined;
      
      switch (type) {
        case "success":
          sonnerToast.success(title, opts);
          break;
        case "error":
          sonnerToast.error(title, opts);
          break;
        case "warning":
          sonnerToast.warning(title, opts);
          break;
        case "info":
          sonnerToast.info(title, opts);
          break;
      }
    }
  };
};
