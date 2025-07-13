import React from "react";
import { Button } from "@/components/ui/button";

interface DeliveryValidationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: any;
  onSuccess: () => void;
}

export function DeliveryValidationDialog({
  isOpen,
  onClose,
  delivery,
  onSuccess,
}: DeliveryValidationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4">Validation de Livraison</h3>
        <p className="mb-4">
          Composant de validation en cours de développement
        </p>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              onSuccess();
              onClose();
            }}
          >
            Valider
          </Button>
        </div>
      </div>
    </div>
  );
}

export default DeliveryValidationDialog;
