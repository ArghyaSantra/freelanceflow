import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import prisma from "../lib/prisma";
import { getPresignedUploadUrl, getPresignedDownloadUrl } from "../lib/s3";
import { AppError } from "../middleware/errorHandler";
import { createNotification, getClientUserId } from "../lib/notifications";

const generateAssetKey = (
  workspaceId: string,
  assetId: string,
  filename: string,
): string => {
  return `assets/${workspaceId}/${assetId}/${filename}`;
};

// POST /assets/upload-url
export const getAssetUploadUrl = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { filename, projectId, contentType } = req.body;
    const workspaceId = req.workspace!.id;

    if (!filename || !projectId) {
      throw new AppError(400, "filename and projectId are required");
    }

    // verify project belongs to workspace
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new AppError(404, "Project not found");
    }

    const assetId = uuidv4();
    const sanitizedFilename = filename
      .replace(/\s+/g, "_")
      .replace(/[()]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    const key = generateAssetKey(workspaceId, assetId, sanitizedFilename);

    const uploadUrl = await getPresignedUploadUrl(
      key,
      contentType ?? "image/jpeg",
    );

    res.json({ uploadUrl, assetId, key });
  } catch (err) {
    next(err);
  }
};

// POST /assets
export const createAsset = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const {
      assetId,
      projectId,
      clientId,
      title,
      description,
      fileKey,
      contentType,
    } = req.body;

    const workspaceId = req.workspace!.id;
    const uploadedBy = req.user!.id;

    if (!assetId || !projectId || !clientId || !title || !fileKey) {
      throw new AppError(
        400,
        "assetId, projectId, clientId, title and fileKey are required",
      );
    }

    // verify project belongs to workspace
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new AppError(404, "Project not found");
    }

    // verify client belongs to workspace
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client || client.workspaceId !== workspaceId) {
      throw new AppError(404, "Client not found");
    }

    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    const asset = await prisma.asset.create({
      data: {
        id: assetId,
        workspaceId,
        projectId,
        clientId,
        title,
        description: description ?? null,
        fileUrl,
        type: (contentType as string)?.startsWith("video/") ? "VIDEO" : "IMAGE",
        status: "PENDING",
        uploadedBy,
      },
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        comments: true,
      },
    });
    const clientUserId = await getClientUserId(clientId);
    if (clientUserId) {
      await createNotification({
        workspaceId,
        recipientId: clientUserId,
        recipientType: "CLIENT",
        type: "ASSET_UPLOADED", // reuse closest type, or add ASSET_UPLOADED to schema
        title: "New asset for review",
        message: `"${title}" has been uploaded for your review.`,
        linkPath: `/client/assets/${assetId}`,
      });
    }

    res.status(201).json({ asset });
  } catch (err) {
    next(err);
  }
};

// GET /assets?projectId=
export const getAssets = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = req.workspace!.id;
    const { projectId } = req.query;

    if (!projectId) {
      throw new AppError(400, "projectId query param is required");
    }

    // verify project belongs to workspace
    const project = await prisma.project.findUnique({
      where: { id: projectId as string },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new AppError(404, "Project not found");
    }

    const assets = await prisma.asset.findMany({
      where: { workspaceId, projectId: projectId as string },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        comments: { orderBy: { createdAt: "asc" } },
      },
    });

    // generate presigned view URLs
    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => {
        const key = asset.fileUrl.split(".amazonaws.com/")[1];
        return { ...asset, viewUrl: await getPresignedDownloadUrl(key) };
      }),
    );

    res.json({ assets: assetsWithUrls });
  } catch (err) {
    next(err);
  }
};

// GET /assets/:id
export const getAsset = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        comments: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!asset || asset.workspaceId !== workspaceId) {
      throw new AppError(404, "Asset not found");
    }

    const key = asset.fileUrl.split(".amazonaws.com/")[1];
    const viewUrl = await getPresignedDownloadUrl(key);

    res.json({ asset: { ...asset, viewUrl } });
  } catch (err) {
    next(err);
  }
};

// DELETE /assets/:id
export const deleteAsset = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;

    const asset = await prisma.asset.findUnique({ where: { id } });

    if (!asset || asset.workspaceId !== workspaceId) {
      throw new AppError(404, "Asset not found");
    }

    await prisma.asset.delete({ where: { id } });

    res.json({ message: "Asset deleted" });
  } catch (err) {
    next(err);
  }
};

// POST /assets/:id/comments
export const addFreelancerComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;
    const { content } = req.body;

    if (!content?.trim()) {
      throw new AppError(400, "Comment content is required");
    }

    const asset = await prisma.asset.findUnique({ where: { id } });

    if (!asset || asset.workspaceId !== workspaceId) {
      throw new AppError(404, "Asset not found");
    }

    const comment = await prisma.assetComment.create({
      data: {
        assetId: id,
        authorId: req.user!.id,
        authorType: "FREELANCER",
        content: content.trim(),
      },
    });

    const clientUserId = await getClientUserId(asset.clientId);
    if (clientUserId) {
      await createNotification({
        workspaceId: asset.workspaceId,
        recipientId: clientUserId,
        recipientType: "CLIENT",
        type: "ASSET_COMMENT",
        title: "New comment on asset",
        message: `A comment was added to "${asset.title}".`,
        linkPath: `/client/assets/${id}`,
      });
    }

    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
};
