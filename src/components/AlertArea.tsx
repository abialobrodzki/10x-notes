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
      className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 backdrop-blur-sm"
    >
      <ul className="list-disc space-y-1 pl-5 text-sm text-red-200">
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
