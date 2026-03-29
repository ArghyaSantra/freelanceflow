import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { FieldType } from "@prisma/client";

export const createDocumentField = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const documentId = req.params.id as string;
    const workspaceId = req.workspace!.id;
    const { type, pageNumber, x, y, width, height } = req.body;

    if (
      !pageNumber ||
      x === undefined ||
      y === undefined ||
      !width ||
      !height
    ) {
      throw new AppError(
        400,
        "pageNumber, x, y, width and height are required",
      );
    }

    // verify document belongs to workspace
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.workspaceId !== workspaceId) {
      throw new AppError(404, "Document not found");
    }

    if (document.status !== "DRAFT") {
      throw new AppError(
        400,
        "Cannot add fields to a document that has already been sent",
      );
    }

    const field = await prisma.documentField.create({
      data: {
        documentId,
        type: (type as FieldType) ?? "SIGNATURE",
        pageNumber,
        x,
        y,
        width,
        height,
      },
    });

    res.status(201).json(field);
  } catch (err) {
    next(err);
  }
};

export const getDocumentFields = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const documentId = req.params.id as string;
    const workspaceId = req.workspace!.id;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.workspaceId !== workspaceId) {
      throw new AppError(404, "Document not found");
    }

    const fields = await prisma.documentField.findMany({
      where: { documentId },
      orderBy: { pageNumber: "asc" },
    });

    res.json(fields);
  } catch (err) {
    next(err);
  }
};

export const deleteDocumentField = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const fieldId = req.params.fieldId as string;
    const workspaceId = req.workspace!.id;

    const field = await prisma.documentField.findUnique({
      where: { id: fieldId },
      include: { document: true },
    });

    if (!field || field.document.workspaceId !== workspaceId) {
      throw new AppError(404, "Field not found");
    }

    if (field.document.status !== "DRAFT") {
      throw new AppError(
        400,
        "Cannot delete fields from a document that has already been sent",
      );
    }

    await prisma.documentField.delete({
      where: { id: fieldId },
    });

    res.json({ message: "Field deleted successfully" });
  } catch (err) {
    next(err);
  }
};

export const sendDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const documentId = req.params.id as string;
    const workspaceId = req.workspace!.id;
    const userId = req.user!.id;

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        documentFields: true,
        project: {
          include: { client: true },
        },
      },
    });

    if (!document || document.workspaceId !== workspaceId) {
      throw new AppError(404, "Document not found");
    }

    if (document.status !== "DRAFT") {
      throw new AppError(400, "Document has already been sent");
    }

    if (document.documentFields.length === 0) {
      throw new AppError(
        400,
        "Document must have at least one signature field before sending",
      );
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "SENT",
        sentBy: userId,
        sentAt: new Date(),
        signerEmail: document.project.client.email,
      },
      include: {
        project: {
          include: { client: true },
        },
      },
    });

    // signing link
    const signingLink = `${process.env.FRONTEND_URL}/sign/${document.publicToken}`;

    res.json({
      ...updated,
      signingLink,
    });
  } catch (err) {
    next(err);
  }
};
