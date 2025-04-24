"use client";

import { RegisterForm } from "@/components/auth/register-form";
import { Container } from "@/components/ui/container";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const t = useTranslations("auth");
  
  return (
    <Container className="py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">{t("register.title")}</h1>
        <RegisterForm />
      </div>
    </Container>
  );
}
