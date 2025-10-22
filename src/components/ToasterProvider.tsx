import { Toaster } from "sonner";

/**
 * ToasterProvider - Sonner toast notification provider
 * Features:
 * - Position: top-right
 * - Rich colors for different toast types
 * - Dark theme compatible
 * - Accessible with ARIA
 */
export function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: "rgba(15, 23, 42, 0.95)",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          color: "rgb(226, 232, 240)",
        },
      }}
    />
  );
}
