"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UserRoleEnum } from "@/lib/validations/auth.schema";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

const USER_ROLES = [
  {
    type: UserRoleEnum.enum.CLIENT,
    title: "Client",
    description: "Inscrivez-vous en tant que client pour commander des produits auprès de commerçants locaux avec une livraison éco-responsable",
    path: "/register/customer",
    icon: <Icons.user className="h-6 w-6" />,
  },
  {
    type: UserRoleEnum.enum.COMMERCANT,
    title: "Commerçant",
    description: "Inscrivez-vous en tant que commerçant pour vendre vos produits à nos clients avec une livraison éco-responsable",
    path: "/register/merchant",
    icon: <Icons.store className="h-6 w-6" />,
  },
  {
    type: UserRoleEnum.enum.LIVREUR,
    title: "Livreur",
    description: "Inscrivez-vous en tant que livreur pour livrer des produits à nos clients en utilisant des modes de transport écologiques",
    path: "/register/courier", 
    icon: <Icons.bicycle className="h-6 w-6" />,
  },
  {
    type: UserRoleEnum.enum.PRESTATAIRE,
    title: "Prestataire",
    description: "Inscrivez-vous en tant que prestataire pour offrir des services spécialisés à notre écosystème",
    path: "/register/provider",
    icon: <Icons.tool className="h-6 w-6" />,
  },
];

interface RegisterFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function RegisterForm({ className, ...props }: RegisterFormProps) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  
  const handleSelectRole = useCallback((role: string) => {
    setSelectedRole(role);
  }, []);

  const handleContinue = useCallback(() => {
    const selectedRoleInfo = USER_ROLES.find(role => role.type === selectedRole);
    if (selectedRoleInfo) {
      router.push(selectedRoleInfo.path);
    }
  }, [selectedRole, router]);

  const handleSocialSignIn = useCallback((provider: 'google' | 'facebook') => {
    // Note: This would need to be implemented with your auth provider
    console.log(`Sign in with ${provider}`);
  }, []);

        return (
    <div className="w-full h-screen flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 lg:p-12 overflow-y-auto">
      <div className="w-full max-w-screen-2xl">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-center mb-12 sm:mb-16 md:mb-20">Choisissez votre profil</h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 w-full mb-12 md:mb-16">
          {USER_ROLES.map((role) => (
            <div 
              key={role.type}
              className={cn(
                "h-full border rounded-xl cursor-pointer transition-all transform hover:scale-102 shadow hover:shadow-md",
                selectedRole === role.type 
                  ? "border-2 border-primary bg-background shadow-lg" 
                  : "border-border hover:border-primary/50 hover:bg-muted/20"
              )}
              onClick={() => handleSelectRole(role.type)}
            >
              <div className="p-4 sm:p-6 md:p-8 flex flex-col items-center text-center h-full justify-between">
                <div className={cn(
                  "mx-auto flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full mb-4 sm:mb-6 md:mb-8",
                  selectedRole === role.type ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12">{role.icon}</div>
              </div>
                
                <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-3 md:mb-4">{role.title}</h2>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">{role.description}</p>
      </div>
            </div>
          ))}
      </div>
      
        <div className="w-full sm:max-w-lg md:max-w-xl mx-auto">
                    <Button
            className="w-full h-12 sm:h-14 md:h-16 text-base sm:text-lg md:text-xl font-medium"
            disabled={!selectedRole}
            onClick={handleContinue}
          >
            Continuer
                    </Button>

          <div className="relative my-8 md:my-10">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 sm:px-6 text-muted-foreground text-base sm:text-lg">
                Ou continuer avec
          </span>
        </div>
      </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <Button 
          variant="outline" 
              className="h-12 sm:h-14 md:h-16 text-base sm:text-lg"
              onClick={() => handleSocialSignIn('google')}
            >
              <Icons.google className="mr-2 h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
          Google
        </Button>
        <Button 
          variant="outline" 
              className="h-12 sm:h-14 md:h-16 text-base sm:text-lg"
              onClick={() => handleSocialSignIn('facebook')}
            >
              <Icons.facebook className="mr-2 h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
          Facebook
        </Button>
      </div>
        </div>
      </div>
    </div>
  );
} 