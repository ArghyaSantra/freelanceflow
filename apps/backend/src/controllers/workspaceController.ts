import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

export const updateWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = req.workspace!.id;
    const {
      name,
      address,
      gstin,
      pan,
      bankName,
      bankAccountNumber,
      bankIfsc,
      invoicePrefix,
      invoiceFooter,
    } = req.body;

    if (!name) {
      throw new AppError(400, "Workspace name is required");
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(gstin !== undefined && { gstin }),
        ...(pan !== undefined && { pan }),
        ...(bankName !== undefined && { bankName }),
        ...(bankAccountNumber !== undefined && { bankAccountNumber }),
        ...(bankIfsc !== undefined && { bankIfsc }),
        ...(invoicePrefix && { invoicePrefix }),
        ...(invoiceFooter !== undefined && { invoiceFooter }),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};
