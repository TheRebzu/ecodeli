"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth.register");

  const roles = [
    { id: "client", label: t("roles.client"), icon: "👤" },
    { id: "deliverer", label: t("roles.deliverer"), icon: "🚚" },
    { id: "merchant", label: t("roles.merchant"), icon: "🏪" },
    { id: "provider", label: t("roles.provider"), icon: "🛠️" },
  ];

  const handleRoleSelect = (role: string) => {
    router.push(`/register/${role}`);
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle>{t("selectRole")}</CardTitle>
        <CardDescription>{t("roleDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <Button
              key={role.id}
              variant="outline"
              className="h-auto p-6 flex flex-col items-center justify-center gap-3 hover:bg-muted"
              onClick={() => handleRoleSelect(role.id)}
            >
              <span className="text-3xl">{role.icon}</span>
              <span className="text-lg font-medium">{role.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
