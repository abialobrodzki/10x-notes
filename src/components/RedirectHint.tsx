/**
 * RedirectHint component - displays registration link
 * Styled for dark gradient background
 */
export default function RedirectHint() {
  return (
    <p className="text-center text-sm text-glass-text-muted">
      Nie masz konta?{" "}
      <a href="/register" className="font-medium text-glass-text hover-link">
        Zarejestruj się
      </a>
    </p>
  );
}
