interface AlertAreaProps {
  messages?: string[];
  variant?: "success" | "error" | "info";
}

/**
 * AlertArea component - displays alert messages with different variants
 * Uses role="alert" for accessibility
 * Styled with glassmorphism for dark gradient background
 * Supports success (green), error (red), and info (blue) variants
 */
export default function AlertArea({ messages, variant = "error" }: AlertAreaProps) {
  if (!messages || messages.length === 0) {
    return null;
  }

  // Define styles for each variant
  const variantStyles = {
    success: "border-green-500/50 bg-green-500/10 text-green-400",
    error: "border-destructive/50 bg-destructive/10 text-glass-text",
    info: "border-blue-500/50 bg-blue-500/10 text-blue-400",
  };

  return (
    <div role="alert" aria-live="polite" className={`rounded-lg border p-4 backdrop-blur-sm ${variantStyles[variant]}`}>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
