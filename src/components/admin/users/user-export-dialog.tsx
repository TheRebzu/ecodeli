import { useState } from 'react';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface UserExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: 'csv' | 'excel' | 'pdf', fields: string[]) => void;
  selectedCount?: number;
}

// Liste des champs disponibles pour l'exportation
const availableFields = [
  { id: 'id', label: 'ID' },
  { id: 'name', label: 'Nom' },
  { id: 'email', label: 'Email' },
  { id: 'role', label: 'Rôle' },
  { id: 'status', label: 'Statut' },
  { id: 'createdAt', label: 'Date d\'inscription' },
  { id: 'lastLoginAt', label: 'Dernière connexion' },
  { id: 'isVerified', label: 'Vérifié' },
  { id: 'phoneNumber', label: 'Téléphone' },
  { id: 'country', label: 'Pays' },
  { id: 'city', label: 'Ville' },
  { id: 'documentsCount', label: 'Nombre de documents' },
  { id: 'pendingVerificationsCount', label: 'Vérifications en attente' },
  { id: 'lastActivityAt', label: 'Dernière activité' },
  { id: 'emailVerified', label: 'Email vérifié' },
  { id: 'phoneVerified', label: 'Téléphone vérifié' },
  { id: 'subscriptionStatus', label: 'Statut d\'abonnement' }
];

export function UserExportDialog({ 
  open, 
  onOpenChange, 
  onExport,
  selectedCount 
}: UserExportDialogProps) {
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'name', 'email', 'role', 'status', 'createdAt', 'lastLoginAt'
  ]);

  const handleFieldToggle = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  const handleSelectAllFields = () => {
    setSelectedFields(availableFields.map(field => field.id));
  };

  const handleClearFields = () => {
    setSelectedFields([]);
  };

  const handleExport = () => {
    if (selectedFields.length === 0) {
      return;
    }
    onExport(format, selectedFields);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exporter des utilisateurs</DialogTitle>
          <DialogDescription>
            {selectedCount 
              ? `Exporter ${selectedCount} utilisateur${selectedCount > 1 ? 's' : ''} sélectionné${selectedCount > 1 ? 's' : ''}`
              : 'Exporter tous les utilisateurs selon les filtres appliqués'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Format d'exportation</h3>
            <Tabs defaultValue={format} onValueChange={(value) => setFormat(value as any)} className="w-full">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="csv" className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  CSV
                </TabsTrigger>
                <TabsTrigger value="excel" className="flex items-center">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Champs à exporter</h3>
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleSelectAllFields}
                >
                  Tout sélectionner
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearFields}
                >
                  Effacer
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {availableFields.map(field => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`field-${field.id}`} 
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={() => handleFieldToggle(field.id)}
                  />
                  <Label htmlFor={`field-${field.id}`}>{field.label}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={selectedFields.length === 0}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 