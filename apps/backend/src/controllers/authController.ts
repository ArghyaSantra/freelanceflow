import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt";
import { AppError } from "../middleware/errorHandler";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password, workspaceName } = req.body;

    if (!email || !password || !workspaceName) {
      throw new AppError(400, "email, password and workspaceName are required");
    }

    if (password.length < 8) {
      throw new AppError(400, "Password must be at least 8 characters");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, "Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { user, workspace, member } = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.create({
          data: { email, passwordHash },
        });

        const workspace = await tx.workspace.create({
          data: { name: workspaceName },
        });

        const member = await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: user.id,
            role: "ADMIN",
          },
        });

        return { user, workspace, member };
      },
    );

    const accessToken = generateAccessToken({
      userId: user.id,
      workspaceId: workspace.id,
      role: member.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      workspaceId: workspace.id,
      role: member.role,
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
      },
      member: {
        role: member.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError(400, "email and password are required");
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "Invalid credentials");
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { userId: user.id },
      include: { workspace: true },
    });

    if (!member) {
      throw new AppError(404, "Workspace not found");
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      workspaceId: member.workspaceId,
      role: member.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      workspaceId: member.workspaceId,
      role: member.role,
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
      },
      workspace: {
        id: member.workspace.id,
        name: member.workspace.name,
        plan: member.workspace.plan,
      },
      member: {
        role: member.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      throw new AppError(401, "No refresh token");
    }

    const payload = verifyRefreshToken(token);

    const stored = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError(401, "Refresh token expired or revoked");
    }

    // rotate refresh token
    await prisma.refreshToken.delete({ where: { token } });

    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      workspaceId: payload.workspaceId,
      role: payload.role,
    });

    const newRefreshToken = generateRefreshToken({
      userId: payload.userId,
      workspaceId: payload.workspaceId,
      role: payload.role,
    });

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: payload.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }

    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

export const me = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json({
      user: {
        id: req.user!.id,
        email: req.user!.email,
      },
      workspace: {
        id: req.workspace!.id,
        name: req.workspace!.name,
        plan: req.workspace!.plan,
        logoUrl: req.workspace!.logoUrl,
      },
      member: {
        role: req.member!.role,
      },
    });
  } catch (err) {
    next(err);
  }
};
