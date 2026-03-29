import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { ProjectStatus } from "@prisma/client";

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, description, clientId } = req.body;
    const workspaceId = req.workspace!.id;

    if (!name || !clientId) {
      throw new AppError(400, "name and clientId are required");
    }

    // verify client belongs to this workspace
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client || client.workspaceId !== workspaceId || !client.isActive) {
      throw new AppError(404, "Client not found");
    }

    const project = await prisma.project.create({
      data: {
        workspaceId,
        clientId,
        name,
        description,
      },
      include: {
        client: true,
      },
    });

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
};

export const getProjects = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = req.workspace!.id;
    const { clientId, status } = req.query;

    // validate status if provided
    const validStatuses = ["ACTIVE", "COMPLETED", "ARCHIVED"];
    if (status && !validStatuses.includes(status as string)) {
      throw new AppError(400, "status must be ACTIVE, COMPLETED or ARCHIVED");
    }

    const projects = await prisma.project.findMany({
      where: {
        workspaceId,
        ...(clientId && { clientId: clientId as string }),
        ...(status && { status: status as ProjectStatus }),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            company: true,
          },
        },
        _count: {
          select: {
            documents: true,
            invoices: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(projects);
  } catch (err) {
    next(err);
  }
};

export const getProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        documents: {
          orderBy: { createdAt: "desc" },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new AppError(404, "Project not found");
    }

    res.json(project);
  } catch (err) {
    next(err);
  }
};

export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;
    const { name, description } = req.body;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new AppError(404, "Project not found");
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        client: true,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const updateProjectStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;
    const { status } = req.body;

    const validStatuses = ["ACTIVE", "COMPLETED", "ARCHIVED"];
    if (!status || !validStatuses.includes(status)) {
      throw new AppError(400, "status must be ACTIVE, COMPLETED or ARCHIVED");
    }

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new AppError(404, "Project not found");
    }

    const updated = await prisma.project.update({
      where: { id },
      data: { status },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};
