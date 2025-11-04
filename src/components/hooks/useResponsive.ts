import { useState, useEffect } from "react";

/**
 * Hook for detecting mobile vs desktop view
 *
 * Features:
 * - Detects viewport width against md breakpoint (768px)
 * - Updates on window resize
 * - Manages event listener cleanup
 *
 * @returns Boolean indicating if viewport is mobile (< 768px)
 */
export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}
