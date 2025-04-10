// src/app/client/announcements/[id]/page.tsx
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

import { AnnouncementDetail } from "@/components/announcements/announcement-detail";

export const metadata: Metadata = {
  title: "Détail de l'annonce",
  description: "Voir les détails d'une annonce",
};

export default async function AnnouncementDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const announcement = await prisma.announcement.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      merchant: true,
      courier: true,
      bids: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              rating: true,
            },
          },
        },
      },
    },
  });

  if (!announcement) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <AnnouncementDetail 
        announcement={announcement} 
        userRole={session.user.role}
        userId={session.user.id}
      />
    </div>
  );
}