"use client";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Container } from "@/components/ui/container";
import { useTranslations } from "next-intl";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");

  return (
    <Container className="py-10">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">
          {t("resetPassword.title")}
        </h1>
        <ResetPasswordForm />
      </div>
    </Container>
  );
}
