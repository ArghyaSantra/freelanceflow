import { Request, Response, NextFunction } from "express";
import type { User, Workspace, WorkspaceMember } from "@prisma/client";
import { verifyAccessToken } from "../lib/jwt";
import prisma from "../lib/prisma";

// extend Express Request type directly here
declare module "express-serve-static-core" {
  interface Request {
    user?: User;
    workspace?: Workspace;
    member?: WorkspaceMember;
  }
}

export const authenticate = async (
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

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId: user.id },
      include: { workspace: true },
    });

    if (!member) {
      res.status(401).json({ error: "Workspace not found" });
      return;
    }

    req.user = user;
    req.workspace = member.workspace;
    req.member = member;

    next();
  } catch (err) {
    next(err);
  }
};

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (req.member?.role !== "ADMIN") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
};
