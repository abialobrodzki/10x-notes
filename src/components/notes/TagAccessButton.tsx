import { Users } from "lucide-react";
import { useState } from "react";
import { TagAccessModal } from "@/components/tag-access";
import { Button } from "@/components/ui/button";

interface TagAccessButtonProps {
  tagId: string;
  isOwner: boolean;
}

/**
 * TagAccessButton - Opens modal to manage tag access
 * Allows tag owners to grant/revoke read-only access to other users
 * Only visible for tag owners
 */
export default function TagAccessButton({ tagId, isOwner }: TagAccessButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!isOwner) {
    return null;
  }

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="space-y-4" data-testid="tag-access-button">
        {/* Section header */}
        <h3 className="bg-linear-to-r from-gradient-heading-from to-purple-200 bg-clip-text text-lg font-semibold text-transparent">
          Udostępnianie
        </h3>

        {/* Description */}
        <p className="text-sm text-glass-text-muted">
          Możesz udostępnić tę etykietę innym użytkownikom. Będą mieli dostęp do wszystkich notatek z tą etykietą.
        </p>

        {/* Button */}
        <Button
          onClick={handleOpenModal}
          variant="outline"
          className="w-full border-input-border bg-glass-bg-from text-glass-text hover-glass"
          data-testid="tag-access-button-manage-button"
        >
          <Users className="mr-2 h-4 w-4" />
          Zarządzaj dostępem
        </Button>
      </div>

      {/* Tag Access Modal */}
      <TagAccessModal tagId={tagId} isOwner={isOwner} isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  );
}
