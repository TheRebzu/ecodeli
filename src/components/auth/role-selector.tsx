"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface RoleOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
}

const roleOptions: RoleOption[] = [
  {
    id: "client",
    title: "Client",
    description:
      "Déposez des annonces pour envoyer des colis et réservez des services à la personne",
    icon: "/images/roles/client.svg",
    path: "/register/client",
  },
  {
    id: "deliverer",
    title: "Livreur",
    description:
      "Devenez livreur freelance et gagnez de l'argent en livrant des colis de particuliers",
    icon: "/images/roles/deliverer.svg",
    path: "/register/deliverer",
  },
  {
    id: "merchant",
    title: "Commerçant",
    description:
      "Inscrivez votre commerce et proposez des livraisons à vos clients via notre plateforme",
    icon: "/images/roles/merchant.svg",
    path: "/register/merchant",
  },
  {
    id: "provider",
    title: "Prestataire de services",
    description:
      "Proposez vos services à la personne et développez votre clientèle",
    icon: "/images/roles/provider.svg",
    path: "/register/provider",
  },
];

export function RoleSelector() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const router = useRouter();

  const handleRoleSelection = (roleId: string) => {
    setSelectedRole(roleId);
  };

  const handleContinue = () => {
    if (!selectedRole) return;

    const selectedOption = roleOptions.find(
      (option) => option.id === selectedRole,
    );
    if (selectedOption) {
      router.push(selectedOption.path);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Rejoignez EcoDeli</h1>
        <p className="text-lg text-muted-foreground">
          Sélectionnez votre profil pour commencer votre inscription
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {roleOptions.map((role) => (
          <div
            key={role.id}
            className={`border rounded-lg p-6 cursor-pointer transition-all ${
              selectedRole === role.id
                ? "border-primary bg-primary/5 ring-2 ring-primary"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => handleRoleSelection(role.id)}
          >
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                {/* Fallback to placeholder if image is not available */}
                {role.icon ? (
                  <Image
                    src={role.icon}
                    alt={role.title}
                    width={32}
                    height={32}
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary/20 rounded-full"></div>
                )}
              </div>
              <div>
                <h3 className="font-medium text-xl mb-1">{role.title}</h3>
                <p className="text-muted-foreground">{role.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          className={`px-6 py-2 rounded-md ${
            selectedRole
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
          onClick={handleContinue}
          disabled={!selectedRole}
        >
          Continuer
        </button>
      </div>
    </div>
  );
}

export default RoleSelector;
