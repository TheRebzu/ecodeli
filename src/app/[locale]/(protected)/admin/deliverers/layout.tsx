import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gestion des Livreurs - EcoDeli Admin",
  description: "Gérez et supervisez tous les livreurs de la plateforme EcoDeli",
};

export default function DeliverersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
