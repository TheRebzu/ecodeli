// src/app/client/announcements/create/page.tsx
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

import { CreateAnnouncementForm } from "@/components/announcements/create-announcement-form";

export const metadata: Metadata = {
  title: "Créer une annonce",
  description: "Créer une nouvelle annonce",
};

export default async function CreateAnnouncementPage() {
  const session = await auth();
  
  // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
  if (!session?.user) {
    redirect("/auth/login");
  }
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Créer une nouvelle annonce</h1>
      <CreateAnnouncementForm />
    </div>
  );
}
