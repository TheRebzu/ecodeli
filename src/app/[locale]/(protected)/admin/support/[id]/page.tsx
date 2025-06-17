"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import UserTable from "@/components/admin/users/user-table";

export default function TicketDetailPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Ticket"
        description={t("admin.TicketDetail.description")}
      />

      <Card className="p-6">
        <UserTable
          users={[]}
          onSelectionChange={() => {}}
          selectedUserIds={[]}
          isLoading={false}
        />
      </Card>
    </div>
  );
}
