import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import prisma from "../lib/prisma";
import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  generateDocumentKey,
} from "../lib/s3";
import { AppError } from "../middleware/errorHandler";

export const getUploadUrl = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { filename, projectId, title } = req.body;
    const workspaceId = req.workspace!.id;

    if (!filename || !projectId || !title) {
      throw new AppError(400, "filename, projectId and title are required");
    }

    // verify project belongs to workspace
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new AppError(404, "Project not found");
    }

    // generate a document ID upfront
    const documentId = uuidv4();
    const sanitizedFilename = filename
      .replace(/\s+/g, "_") // spaces → underscores
      .replace(/[()]/g, "") // remove parentheses
      .replace(/[^a-zA-Z0-9._-]/g, ""); // remove special chars
    const key = generateDocumentKey(workspaceId, documentId, filename);

    const uploadUrl = await getPresignedUploadUrl(key);

    res.json({
      uploadUrl,
      documentId,
      key,
    });
  } catch (err) {
    next(err);
  }
};

export const createDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { documentId, projectId, title, fileKey } = req.body;
    const workspaceId = req.workspace!.id;

    if (!documentId || !projectId || !title || !fileKey) {
      throw new AppError(
        400,
        "documentId, projectId, title and fileKey are required",
      );
    }

    // verify project belongs to workspace
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new AppError(404, "Project not found");
    }

    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    const document = await prisma.document.create({
      data: {
        id: documentId,
        workspaceId,
        projectId,
        title,
        fileUrl,
      },
      include: {
        project: {
          include: { client: true },
        },
      },
    });

    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
};

export const getDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = req.workspace!.id;
    const { projectId } = req.query;

    const documents = await prisma.document.findMany({
      where: {
        workspaceId,
        ...(projectId && { projectId: projectId as string }),
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            client: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { documentFields: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(documents);
  } catch (err) {
    next(err);
  }
};

export const getDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        project: {
          include: { client: true },
        },
        documentFields: true,
      },
    });

    if (!document || document.workspaceId !== workspaceId) {
      throw new AppError(404, "Document not found");
    }

    // generate presigned download URL for the PDF
    const key = decodeURIComponent(
      document.fileUrl.split(".amazonaws.com/")[1],
    );
    const viewUrl = await getPresignedDownloadUrl(key);

    let signedViewUrl: string | undefined;
    if (document.signedFileUrl) {
      const signedKey = document.signedFileUrl
        .split(".amazonaws.com/")[1]
        .split("?")[0]; // remove any query params if present
      console.log("Signed key:", signedKey);
      signedViewUrl = await getPresignedDownloadUrl(signedKey);
      console.log("Generated signed view URL:", signedViewUrl.slice(0, 150));
    }

    res.json({ ...document, viewUrl, signedViewUrl });
  } catch (err) {
    next(err);
  }
};
