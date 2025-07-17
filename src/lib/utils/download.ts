/**
 * Télécharge un fichier de manière sûre en vérifiant que nous sommes côté client
 */
export function downloadFile(url: string, filename: string): void {
  // Vérification que nous sommes côté client
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('downloadFile: fonction appelée côté serveur, téléchargement annulé');
    return;
  }

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // Ajout temporaire au DOM pour déclencher le téléchargement
    document.body.appendChild(link);
    link.click();
    
    // Nettoyage
    document.body.removeChild(link);
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error);
    // Fallback : ouvrir dans un nouvel onglet
    window.open(url, '_blank');
  }
}

/**
 * Ouvre un fichier dans un nouvel onglet de manière sûre
 */
export function openFileInNewTab(url: string): void {
  if (typeof window === 'undefined') {
    console.warn('openFileInNewTab: fonction appelée côté serveur, ouverture annulée');
    return;
  }

  try {
    window.open(url, '_blank');
  } catch (error) {
    console.error('Erreur lors de l\'ouverture du fichier:', error);
  }
}

/**
 * Télécharge des données en tant que fichier
 */
export function downloadData(data: string, filename: string, mimeType: string = 'text/plain'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('downloadData: fonction appelée côté serveur, téléchargement annulé');
    return;
  }

  try {
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    downloadFile(url, filename);
    
    // Nettoyage de l'URL blob
    setTimeout(() => URL.revokeObjectURL(url), 100);
  } catch (error) {
    console.error('Erreur lors du téléchargement des données:', error);
  }
} 