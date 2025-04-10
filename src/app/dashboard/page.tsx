import { RoleRedirect } from "@/components/auth/RoleRedirect";
import { auth } from "@/auth";

export default async function DashboardPage() {
  // Vérifier l'authentification côté serveur
  const session = await auth();
  
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Accès refusé</h1>
          <p>Vous devez être connecté pour accéder à cette page.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {/* Ce composant gère la redirection basée sur le rôle */}
      <RoleRedirect />
      
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirection en cours...</h1>
        <p>Vous allez être redirigé vers votre tableau de bord.</p>
      </div>
    </div>
  );
} 