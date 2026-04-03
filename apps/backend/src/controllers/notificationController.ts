import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

// ─── SSE client maps ──────────────────────────────────────
// separate maps for freelancers and clients
const freelancerClients = new Map<string, Response>();
const clientClients = new Map<string, Response>();

export const getFreelancerClients = () => freelancerClients;
export const getClientClients = () => clientClients;

// ─── SSE Streams ─────────────────────────────────────────

// GET /notifications/stream?token=
export const notificationStream = (req: Request, res: Response): void => {
  const userId = req.user!.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders();

  // send a heartbeat every 25s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 25000);

  freelancerClients.set(userId, res);

  req.on("close", () => {
    clearInterval(heartbeat);
    freelancerClients.delete(userId);
  });
};

// GET /client/notifications/stream?token=
export const clientNotificationStream = (req: Request, res: Response): void => {
  const userId = req.clientUser!.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 25000);

  clientClients.set(userId, res);

  req.on("close", () => {
    clearInterval(heartbeat);
    clientClients.delete(userId);
  });
};

// ─── REST endpoints ───────────────────────────────────────

// GET /notifications
export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId, recipientType: "FREELANCER" },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const unreadCount = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

// POST /notifications/mark-read
export const markAllRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    await prisma.notification.updateMany({
      where: { recipientId: userId, recipientType: "FREELANCER", read: false },
      data: { read: true },
    });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};

// POST /notifications/:id/read
export const markOneRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    next(err);
  }
};

// GET /client/notifications
export const getClientNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.clientUser!.id;
    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId, recipientType: "CLIENT" },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const unreadCount = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

// POST /client/notifications/mark-read
export const markAllClientRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.clientUser!.id;
    await prisma.notification.updateMany({
      where: { recipientId: userId, recipientType: "CLIENT", read: false },
      data: { read: true },
    });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
};
