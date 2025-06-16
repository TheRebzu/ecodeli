import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClientMessaging } from "@/components/client/messages/client-messaging";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  params: Promise<{ locale }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "messages"  });

  return {
    title: t("pageTitle"),
    description: t("pageDescription")};
}

export default async function ClientMessagesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "messages"  });

  return (
    <div className="container mx-auto py-6 px-4 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <ClientMessaging />
      </Suspense>
    </div>
  );
}
