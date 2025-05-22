-- CreateTable
CREATE TABLE "deliverer_favorites" (
    "id" TEXT NOT NULL,
    "delivererId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliverer_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deliverer_favorites_delivererId_announcementId_key" ON "deliverer_favorites"("delivererId", "announcementId");

-- AddForeignKey
ALTER TABLE "deliverer_favorites" ADD CONSTRAINT "deliverer_favorites_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverer_favorites" ADD CONSTRAINT "deliverer_favorites_delivererId_fkey" FOREIGN KEY ("delivererId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
