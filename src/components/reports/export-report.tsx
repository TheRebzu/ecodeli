import { Button } from '@/components/ui/button';

export function ExportReport({ type, data, format = 'pdf' }) {
  const handleExport = () => {
    // Logique d'exportation
  };
  
  return (
    <Button onClick={handleExport}>
      Exporter en {format.toUpperCase()}
    </Button>
  );
}