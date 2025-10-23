interface AlertAreaProps {
  messages?: string[];
}

/**
 * AlertArea component - displays error messages
 * Uses role="alert" for accessibility
 * Styled with glassmorphism for dark gradient background
 */
export default function AlertArea({ messages }: AlertAreaProps) {
  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 backdrop-blur-sm"
    >
      <ul className="list-disc space-y-1 pl-5 text-sm text-glass-text">
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
