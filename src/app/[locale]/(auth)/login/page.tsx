import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import LoginForm from "~/components/auth/login-form";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth/next-auth";

export async function generateMetadata(
  props: {
    params: Promise<{ locale: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const t = await getTranslations({ locale, namespace: "auth.login" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function LoginPage(
  props: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ callbackUrl?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  // Vérifier si l'utilisateur est déjà connecté
  const session = await getServerSession(authOptions);
  if (session) {
    redirect(searchParams.callbackUrl || "/dashboard");
  }

  const t = await getTranslations({ locale, namespace: "auth.login" });

  return (
    <div className="container flex h-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("welcome")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("instructions")}
          </p>
        </div>
        <LoginForm callbackUrl={searchParams.callbackUrl} />
      </div>
    </div>
  );
}
