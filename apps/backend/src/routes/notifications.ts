import dotenv from "dotenv";

dotenv.config();
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authenticateClient } from "../middleware/clientAuth";
import {
  notificationStream,
  clientNotificationStream,
  getNotifications,
  markAllRead,
  markOneRead,
  getClientNotifications,
  markAllClientRead,
} from "../controllers/notificationController";
import jwt from "jsonwebtoken";

// token-based auth middleware for SSE
// (EventSource can't send Authorization headers)
import { verifyAccessToken } from "../lib/jwt";
import prisma from "../lib/prisma";

const sseAuth = async (req: any, res: any, next: any) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(401).end();
      return;
    }
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!, {
      ignoreExpiration: true,
    }) as any;

    if (payload.role === "CLIENT") {
      res.status(403).end();
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) {
      res.status(401).end();
      return;
    }
    const member = await prisma.workspaceMember.findUnique({
      where: { userId: user.id },
      include: { workspace: true },
    });
    if (!member) {
      res.status(401).end();
      return;
    }
    req.user = user;
    req.workspace = member.workspace;
    req.member = member;
    next();
  } catch {
    res.status(401).end();
  }
};

const clientSseAuth = async (req: any, res: any, next: any) => {
  try {
    const token = req.query.token as string;
    console.log("clientSseAuth token:", token ? "present" : "missing");
    if (!token) {
      res.status(401).end();
      return;
    }

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!, {
      ignoreExpiration: true,
    }) as any;
    console.log("clientSseAuth payload:", payload);

    if (payload.role !== "CLIENT") {
      console.log("clientSseAuth role check failed:", payload.role);
      res.status(403).end();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    console.log("clientSseAuth user:", user ? "found" : "not found");
    if (!user) {
      res.status(401).end();
      return;
    }

    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });
    console.log(
      "clientSseAuth client:",
      client ? "found" : "not found",
      "isActive:",
      client?.isActive,
    );
    if (!client || !client.isActive) {
      res.status(401).end();
      return;
    }

    req.clientUser = user;
    req.client = client;
    next();
  } catch (err) {
    console.error("clientSseAuth error:", err);
    res.status(401).end();
  }
};

const freelancerRouter = Router();
freelancerRouter.get("/stream", sseAuth, notificationStream);
freelancerRouter.use(authenticate);
freelancerRouter.get("/", getNotifications);
freelancerRouter.post("/mark-read", markAllRead);
freelancerRouter.post("/:id/read", markOneRead);

const clientRouter = Router();
clientRouter.get("/stream", clientSseAuth, clientNotificationStream);
clientRouter.use(authenticateClient);
clientRouter.get("/", getClientNotifications);
clientRouter.post("/mark-read", markAllClientRead);

export {
  freelancerRouter as notificationRoutes,
  clientRouter as clientNotificationRoutes,
};
