-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DOCUMENT_SIGNED', 'DOCUMENT_SENT', 'INVOICE_PAID', 'INVOICE_SENT', 'ASSET_COMMENT', 'ASSET_APPROVED', 'ASSET_REJECTED');

-- CreateEnum
CREATE TYPE "NotificationRecipientType" AS ENUM ('FREELANCER', 'CLIENT');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "recipient_type" "NotificationRecipientType" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
