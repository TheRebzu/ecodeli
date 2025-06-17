// Helper pour les toasts
export function toast({ 
  title, 
  description, 
  variant = "default" 
}: { 
  title?: string; 
  description?: string; 
  variant?: "default" | "destructive" 
}) {
  // Affichage simple en console pour l'instant
  console.log(`🍞 Toast: ${title} - ${description} (${variant})`);
  
  // En production, ici on pourrait utiliser un vrai système de toast
  if (typeof window !== 'undefined') {
    // Alert simple pour test
    if (variant === 'destructive') {
      console.error(`❌ ${title}: ${description}`);
    } else {
      console.info(`✅ ${title}: ${description}`);
    }
  }
} 