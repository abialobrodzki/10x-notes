/**
 * RedirectHint component - displays registration link
 * Styled for dark gradient background
 */
export default function RedirectHint() {
  return (
    <p className="text-center text-sm text-blue-100/80">
      Nie masz konta?{" "}
      <a
        href="/register"
        className="font-medium text-blue-200 underline-offset-4 transition-colors hover:text-white hover:underline"
      >
        Zarejestruj się
      </a>
    </p>
  );
}
