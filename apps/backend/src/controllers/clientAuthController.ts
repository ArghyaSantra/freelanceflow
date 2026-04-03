import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt";
import { AppError } from "../middleware/errorHandler";

export const clientRegister = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new AppError(400, "token and password are required");
    }

    if (password.length < 8) {
      throw new AppError(400, "Password must be at least 8 characters");
    }

    // verify invitation token
    const invitation = await prisma.clientInvitation.findUnique({
      where: { token },
      include: { client: true },
    });

    if (!invitation) {
      throw new AppError(404, "Invalid invitation token");
    }

    if (invitation.expiresAt < new Date()) {
      throw new AppError(400, "Invitation has expired");
    }

    if (invitation.acceptedAt) {
      throw new AppError(400, "Invitation has already been accepted");
    }

    if (invitation.client.hasAccount) {
      throw new AppError(400, "Client already has an account");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { user, client } = await prisma.$transaction(async (tx) => {
      // create user account
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
        },
      });

      // link client to user
      const client = await tx.client.update({
        where: { id: invitation.clientId },
        data: {
          hasAccount: true,
          userId: user.id,
        },
      });

      // mark invitation as accepted
      await tx.clientInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return { user, client };
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      workspaceId: client.workspaceId,
      role: "CLIENT",
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      workspaceId: client.workspaceId,
      role: "CLIENT",
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("clientRefreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      accessToken,
      user: { id: user.id, email: user.email },
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        workspaceId: client.workspaceId,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const clientLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, "email and password are required");
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "Invalid credentials");
    }

    // verify this user is a client
    const client = await prisma.client.findUnique({
      where: { userId: user.id },
    });

    if (!client || !client.hasAccount) {
      throw new AppError(403, "This account is not a client account");
    }

    if (!client.isActive) {
      throw new AppError(403, "Your account has been deactivated");
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      workspaceId: client.workspaceId,
      role: "CLIENT",
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      workspaceId: client.workspaceId,
      role: "CLIENT",
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("clientRefreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: { id: user.id, email: user.email },
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        workspaceId: client.workspaceId,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const clientLogout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.clientRefreshToken;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }
    res.clearCookie("clientRefreshToken");
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

export const clientMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json({
      user: {
        id: req.clientUser!.id,
        email: req.clientUser!.email,
      },
      client: {
        id: req.client!.id,
        name: req.client!.name,
        email: req.client!.email,
        workspaceId: req.client!.workspaceId,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getInvitation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.params.token as string; // ← fix 1: cast to string

    const invitation = await prisma.clientInvitation.findUnique({
      where: { token },
      include: { client: true, workspace: true },
    });

    if (!invitation) {
      throw new AppError(404, "Invalid invitation token");
    }

    if (invitation.expiresAt < new Date()) {
      throw new AppError(400, "Invitation has expired");
    }

    if (invitation.acceptedAt) {
      throw new AppError(400, "Invitation already accepted");
    }

    res.json({
      clientName: invitation.client.name,
      workspaceName: invitation.workspace.name,
      email: invitation.email,
    });
  } catch (err) {
    next(err);
  }
};
