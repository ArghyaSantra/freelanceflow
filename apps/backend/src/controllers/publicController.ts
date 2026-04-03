import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { getPresignedDownloadUrl } from "../lib/s3";
import { AppError } from "../middleware/errorHandler";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { createNotification, getFreelancerUserId } from "../lib/notifications";

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

const signatureQueue = new Queue("embed-signature", { connection: redis });
const emailQueue = new Queue("send-email", { connection: redis });

export const getDocumentByToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.params.token as string;

    const doc = await prisma.document.findUnique({
      where: { publicToken: token },
      include: {
        documentFields: {
          orderBy: { pageNumber: "asc" },
        },
        project: {
          include: {
            client: true,
            workspace: {
              select: {
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!doc) {
      throw new AppError(404, "Document not found");
    }

    if (doc.status === "DRAFT") {
      throw new AppError(
        400,
        "This document has not been sent for signing yet",
      );
    }

    if (doc.status === "SIGNED") {
      throw new AppError(400, "This document has already been signed");
    }

    if (doc.status === "EXPIRED" || doc.status === "CANCELLED") {
      throw new AppError(400, "This signing link is no longer valid");
    }

    if (doc.expiresAt && doc.expiresAt < new Date()) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "EXPIRED" },
      });
      throw new AppError(400, "This signing link has expired");
    }

    if (doc.status === "SENT") {
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: "VIEWED" },
      });
    }

    const key = doc.fileUrl.split(".amazonaws.com/")[1];
    const viewUrl = await getPresignedDownloadUrl(key);

    res.json({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      documentFields: doc.documentFields,
      viewUrl,
      workspace: {
        name: doc.project.workspace.name,
        logoUrl: doc.project.workspace.logoUrl,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const signDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.params.token as string;
    const { signatureImage, signerName, signerEmail } = req.body;

    if (!signatureImage || !signerName || !signerEmail) {
      throw new AppError(
        400,
        "signatureImage, signerName and signerEmail are required",
      );
    }

    const document = await prisma.document.findUnique({
      where: { publicToken: token },
      include: {
        project: {
          include: {
            workspace: {
              include: {
                members: { include: { user: true } },
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new AppError(404, "Document not found");
    }

    if (document.status !== "VIEWED" && document.status !== "SENT") {
      throw new AppError(400, "Document cannot be signed at this stage");
    }

    if (document.expiresAt && document.expiresAt < new Date()) {
      throw new AppError(400, "This signing link has expired");
    }

    const signerIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";

    const signed = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "SIGNED",
        signerEmail,
        signerIp,
        signedAt: new Date(),
      },
    });

    // queue signature embedding job
    await signatureQueue.add("embed-signature", {
      documentId: document.id,
      signatureImage,
    });

    // notify freelancer via email
    const workspace = document.project.workspace;
    const adminMember = workspace.members.find((m) => m.role === "ADMIN");
    if (adminMember) {
      await emailQueue.add("document-signed", {
        to: adminMember.user.email,
        signerName,
        documentTitle: document.title,
      });
    }

    const freelancerUserId = await getFreelancerUserId(document.workspaceId);
    if (freelancerUserId) {
      await createNotification({
        workspaceId: document.workspaceId,
        recipientId: freelancerUserId,
        recipientType: "FREELANCER",
        type: "DOCUMENT_SIGNED",
        title: "Document signed",
        message: `"${document.title}" has been signed.`,
        linkPath: `/dashboard/documents/${document.id}`,
      });
    }

    res.json({
      message: "Document signed successfully",
      signedAt: signed.signedAt,
    });
  } catch (err) {
    next(err);
  }
};
