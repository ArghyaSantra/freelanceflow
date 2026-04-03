import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { getPresignedDownloadUrl } from "../lib/s3";
import { AppError } from "../middleware/errorHandler";

// GET /client/documents
export const getClientDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const client = req.client!;

    const projects = await prisma.project.findMany({
      where: { clientId: client.id },
      select: { id: true },
    });

    const projectIds = projects.map((p) => p.id);

    const documents = await prisma.document.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        sentAt: true,
        signedAt: true,
        expiresAt: true,
        createdAt: true,
        project: { select: { id: true, name: true } },
      },
    });

    res.json({ documents });
  } catch (err) {
    next(err);
  }
};

// GET /client/documents/:id
export const getClientDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const client = req.client!;
    const id = req.params.id as string;

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, clientId: true } },
        documentFields: true,
      },
    });

    if (!document) {
      throw new AppError(404, "Document not found");
    }

    // ensure document belongs to this client
    if (document.project.clientId !== client.id) {
      throw new AppError(403, "Access denied");
    }

    // generate presigned view URLs
    const viewUrl = await getPresignedDownloadUrl(document.fileUrl);
    let signedViewUrl: string | null = null;
    if (document.signedFileUrl) {
      signedViewUrl = await getPresignedDownloadUrl(document.signedFileUrl);
    }

    res.json({ document: { ...document, viewUrl, signedViewUrl } });
  } catch (err) {
    next(err);
  }
};

// GET /client/invoices
export const getClientInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const client = req.client!;

    const projects = await prisma.project.findMany({
      where: { clientId: client.id },
      select: { id: true },
    });

    const projectIds = projects.map((p) => p.id);

    const invoices = await prisma.invoice.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        currency: true,
        issueDate: true,
        dueDate: true,
        sentAt: true,
        paidAt: true,
        createdAt: true,
        project: { select: { id: true, name: true } },
      },
    });

    res.json({ invoices });
  } catch (err) {
    next(err);
  }
};

// GET /client/invoices/:id
export const getClientInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const client = req.client!;
    const id = req.params.id as string;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, clientId: true } },
        workspace: {
          select: {
            name: true,
            address: true,
            gstin: true,
            pan: true,
            bankName: true,
            bankAccountNumber: true,
            bankIfsc: true,
            invoiceFooter: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new AppError(404, "Invoice not found");
    }

    if (invoice.project.clientId !== client.id) {
      throw new AppError(403, "Access denied");
    }

    res.json({ invoice });
  } catch (err) {
    next(err);
  }
};

// GET /client/assets
export const getClientAssets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const client = req.client!;

    const assets = await prisma.asset.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // generate presigned URLs for each asset
    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => {
        const key = asset.fileUrl.split(".amazonaws.com/")[1]; // ← fix

        return {
          ...asset,
          viewUrl: await getPresignedDownloadUrl(key),
        };
      }),
    );

    res.json({ assets: assetsWithUrls });
  } catch (err) {
    next(err);
  }
};

// POST /client/assets/:id/approve
export const approveAsset = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const client = req.client!;
    const id = req.params.id as string;

    const asset = await prisma.asset.findUnique({ where: { id } });

    if (!asset) {
      throw new AppError(404, "Asset not found");
    }

    if (asset.clientId !== client.id) {
      throw new AppError(403, "Access denied");
    }

    if (asset.status !== "PENDING") {
      throw new AppError(400, "Asset has already been reviewed");
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: { status: "APPROVED" },
    });

    res.json({ asset: updated });
  } catch (err) {
    next(err);
  }
};

// POST /client/assets/:id/reject
export const rejectAsset = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const client = req.client!;
    const id = req.params.id as string;
    const { comment } = req.body;

    const asset = await prisma.asset.findUnique({ where: { id } });

    if (!asset) {
      throw new AppError(404, "Asset not found");
    }

    if (asset.clientId !== client.id) {
      throw new AppError(403, "Access denied");
    }

    if (asset.status !== "PENDING") {
      throw new AppError(400, "Asset has already been reviewed");
    }

    const [updated] = await prisma.$transaction([
      prisma.asset.update({
        where: { id },
        data: { status: "REJECTED" },
      }),
      ...(comment
        ? [
            prisma.assetComment.create({
              data: {
                assetId: id,
                authorId: client.userId!,
                authorType: "CLIENT",
                content: comment,
              },
            }),
          ]
        : []),
    ]);

    res.json({ asset: updated });
  } catch (err) {
    next(err);
  }
};

// POST /client/assets/:id/comments
export const addAssetComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const client = req.client!;
    const id = req.params.id as string;
    const { content } = req.body;

    if (!content?.trim()) {
      throw new AppError(400, "Comment content is required");
    }

    const asset = await prisma.asset.findUnique({ where: { id } });

    if (!asset) {
      throw new AppError(404, "Asset not found");
    }

    if (asset.clientId !== client.id) {
      throw new AppError(403, "Access denied");
    }

    const comment = await prisma.assetComment.create({
      data: {
        assetId: id,
        authorId: client.userId!,
        authorType: "CLIENT",
        content: content.trim(),
      },
    });

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
};
