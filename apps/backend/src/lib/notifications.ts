import prisma from "./prisma";
import { NotificationType, NotificationRecipientType } from "@prisma/client";
import {
  getFreelancerClients,
  getClientClients,
} from "../controllers/notificationController";

interface CreateNotificationInput {
  workspaceId: string;
  recipientId: string;
  recipientType: NotificationRecipientType;
  type: NotificationType;
  title: string;
  message: string;
  linkPath?: string;
}

export const createNotification = async (
  input: CreateNotificationInput,
): Promise<void> => {
  try {
    const notification = await prisma.notification.create({ data: input });
    console.log(
      "✅ Notification created:",
      notification.type,
      "→ recipient:",
      notification.recipientId,
      "type:",
      notification.recipientType,
    );

    // push via SSE if recipient is connected
    if (input.recipientType === "FREELANCER") {
      const res = getFreelancerClients().get(input.recipientId);
      console.log("FREELANCER SSE connected:", !!res);

      if (res) {
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
      }
    } else {
      const res = getClientClients().get(input.recipientId);
      console.log(
        "CLIENT SSE connected:",
        !!res,
        "looking for userId:",
        input.recipientId,
      );
      console.log("All connected clients:", [...getClientClients().keys()]);
      if (res) {
        res.write(`data: ${JSON.stringify(notification)}\n\n`);
      }
    }
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
};

export const getFreelancerUserId = async (
  workspaceId: string,
): Promise<string | null> => {
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId, role: "ADMIN" },
    select: { userId: true },
  });
  return member?.userId ?? null;
};

export const getClientUserId = async (
  clientId: string,
): Promise<string | null> => {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { userId: true, hasAccount: true },
  });
  if (!client?.hasAccount || !client.userId) return null;
  return client.userId;
};
