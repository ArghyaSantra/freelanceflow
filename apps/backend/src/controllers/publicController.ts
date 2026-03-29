import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { getPresignedDownloadUrl } from "../lib/s3";
import { AppError } from "../middleware/errorHandler";

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

    // get signer IP
    const signerIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";

    // update document as signed
    const signed = await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "SIGNED",
        signerEmail,
        signerIp,
        signedAt: new Date(),
      },
    });

    // TODO: queue BullMQ job to embed signature into PDF
    // we will add this when worker service is set up
    console.log(`Document ${document.id} signed by ${signerEmail}`);
    console.log(`Signature image length: ${signatureImage.length}`);

    res.json({
      message: "Document signed successfully",
      signedAt: signed.signedAt,
    });
  } catch (err) {
    next(err);
  }
};
