import { Request, Response, NextFunction } from "express";
import { User, Client } from "@prisma/client";
import { verifyAccessToken } from "../lib/jwt";
import prisma from "../lib/prisma";

declare module "express-serve-static-core" {
  interface Request {
    clientUser?: User;
    client?: Client;
  }
}

export const authenticateClient = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "No token provided" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);

    // verify this is a client token
    if (payload.role !== "CLIENT") {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client || !client.isActive) {
      res.status(401).json({ error: "Client not found" });
      return;
    }

    req.clientUser = user;
    req.client = client;

    next();
  } catch (err) {
    next(err);
  }
};
