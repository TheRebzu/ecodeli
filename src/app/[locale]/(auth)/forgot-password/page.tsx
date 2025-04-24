"use client";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Container } from "@/components/ui/container";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  
  return (
    <Container className="py-10">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">{t("forgotPassword.title")}</h1>
        <ForgotPasswordForm />
      </div>
    </Container>
  );
}
