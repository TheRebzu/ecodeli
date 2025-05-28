/**
 * @deprecated Utilisez directement api.auth.register.useMutation() dans vos composants
 * Cette fonction est conservée pour la compatibilité mais devrait être supprimée
 */
export async function registerUser(userData: any) {
  console.warn('registerUser est déprécié. Utilisez api.auth.register.useMutation() à la place');
  
  try {
    // Cette fonction ne devrait plus être utilisée
    // Les composants doivent utiliser directement les hooks tRPC
    throw new Error('Cette fonction est dépréciée. Utilisez tRPC directement dans vos composants.');
  } catch (error) {
    console.error("Erreur d'enregistrement:", error);
    throw error;
  }
}
