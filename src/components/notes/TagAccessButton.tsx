import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TagAccessButtonProps {
  tagId: string;
  isOwner: boolean;
}

/**
 * TagAccessButton - Opens modal to manage tag access
 * Currently a placeholder - full modal implementation pending
 * Only visible for tag owners
 */
export default function TagAccessButton({ tagId, isOwner }: TagAccessButtonProps) {
  if (!isOwner) {
    return null;
  }

  const handleClick = () => {
    // TODO: Open TagAccessModal when implemented globally
    // eslint-disable-next-line no-console
    console.log("Opening tag access modal for tag:", tagId);
    alert("Zarządzanie dostępem do etykiety - funkcja w przygotowaniu");
  };

  return (
    <div className="space-y-4">
      {/* Section header */}
      <h3 className="bg-gradient-to-r from-gradient-heading-from to-purple-200 bg-clip-text text-lg font-semibold text-transparent">
        Udostępnianie
      </h3>

      {/* Description */}
      <p className="text-sm text-glass-text-muted">
        Możesz udostępnić tę etykietę innym użytkownikom. Będą mieli dostęp do wszystkich notatek z tą etykietą.
      </p>

      {/* Button */}
      <Button
        onClick={handleClick}
        variant="outline"
        className="w-full border-input-border bg-glass-bg-from text-glass-text hover:border-glass-border-hover hover:bg-input-bg"
      >
        <Users className="mr-2 h-4 w-4" />
        Zarządzaj dostępem
      </Button>
    </div>
  );
}
