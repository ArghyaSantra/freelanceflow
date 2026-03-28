import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export const createClient = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, email, company, phone, address } = req.body;
    const workspaceId = req.workspace!.id;

    if (!name || !email) {
      throw new AppError(400, "name and email are required");
    }

    const existing = await prisma.client.findUnique({
      where: {
        workspaceId_email: { workspaceId, email },
      },
    });

    if (existing && existing.isActive) {
      throw new AppError(409, "Client with this email already exists");
    }

    const client = await prisma.client.create({
      data: {
        workspaceId,
        name,
        email,
        company,
        phone,
        address,
      },
    });

    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
};

export const getClients = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = req.workspace!.id;

    const clients = await prisma.client.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(clients);
  } catch (err) {
    next(err);
  }
};

export const getClient = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // not found or belongs to different workspace
    if (!client || client.workspaceId !== workspaceId) {
      throw new AppError(404, "Client not found");
    }

    // soft deleted
    if (!client.isActive) {
      throw new AppError(404, "Client not found");
    }

    res.json(client);
  } catch (err) {
    next(err);
  }
};

export const updateClient = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;
    const { name, email, company, phone, address } = req.body;

    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client || client.workspaceId !== workspaceId || !client.isActive) {
      throw new AppError(404, "Client not found");
    }

    // if email is changing check it's not already taken
    if (email && email !== client.email) {
      const existing = await prisma.client.findUnique({
        where: {
          workspaceId_email: { workspaceId, email },
        },
      });

      if (existing && existing.isActive) {
        throw new AppError(409, "Client with this email already exists");
      }
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(company !== undefined && { company }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteClient = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;

    const client = await prisma.client.findUnique({
      where: { id },
    });

    if (!client || client.workspaceId !== workspaceId || !client.isActive) {
      throw new AppError(404, "Client not found");
    }

    // soft delete
    await prisma.client.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    res.json({ message: "Client deactivated successfully" });
  } catch (err) {
    next(err);
  }
};
