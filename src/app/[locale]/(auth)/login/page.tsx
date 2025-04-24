"use client";

import { LoginForm } from "@/components/auth/login-form";
import { Container } from "@/components/ui/container";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations("auth");
  
  return (
    <Container className="py-10">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">{t("login.title")}</h1>
        <LoginForm />
      </div>
    </Container>
  );
}
