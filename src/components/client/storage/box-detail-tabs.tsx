"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

// Import dynamique du composant client
const BoxUsageHistory = dynamic(() => import("./box-usage-history"), {
  ssr: false,
});

interface BoxDetailTabsProps {
  box: {
    size: number;
    boxType: string;
    features?: string[];
  };
  usageHistory: any[];
}

export function BoxDetailTabs({ box, usageHistory }: BoxDetailTabsProps) {
  const t = useTranslations("storage");

  return (
    <Tabs defaultValue="details">
      <TabsList>
        <TabsTrigger value="details">{t("detailPage.boxDetails")}</TabsTrigger>
        <TabsTrigger value="history">
          {t("detailPage.accessHistory")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("detailPage.boxInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {t("detailPage.boxSize")}
                </span>
                <span>{box.size} m³</span>
              </div>

              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">
                  {t("detailPage.boxType")}
                </span>
                <span>{t(`boxTypes.${box.boxType.toLowerCase()}`)}</span>
              </div>
            </div>

            {box.features && box.features.length > 0 && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">
                  {t("detailPage.features")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {box.features.map((feature: string) => (
                    <Badge key={feature} variant="secondary">
                      {t(`features.${feature.toLowerCase()}`)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="history" className="mt-4">
        <BoxUsageHistory history={usageHistory} />
      </TabsContent>
    </Tabs>
  );
}
