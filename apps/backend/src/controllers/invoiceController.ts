import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { InvoiceStatus } from "@prisma/client";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});
const emailQueue = new Queue("send-email", { connection: redis });

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

const generateInvoiceNumber = async (
  workspaceId: string,
  prefix: string,
): Promise<string> => {
  const count = await prisma.invoice.count({
    where: { workspaceId },
  });

  const number = String(count + 1).padStart(3, "0");
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${number}`;
};

const calculateTotals = (
  lineItems: LineItem[],
  taxRate: number,
): { subtotal: number; taxAmount: number; total: number } => {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
  const total = parseFloat((subtotal + taxAmount).toFixed(2));
  return { subtotal, taxAmount, total };
};

export const createInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = req.workspace!.id;
    const {
      projectId,
      lineItems,
      taxRate = 0,
      currency = "INR",
      issueDate,
      dueDate,
      notes,
    } = req.body;

    if (!projectId || !lineItems || !issueDate || !dueDate) {
      throw new AppError(
        400,
        "projectId, lineItems, issueDate and dueDate are required",
      );
    }

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      throw new AppError(400, "lineItems must be a non-empty array");
    }

    // verify project belongs to workspace
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { workspace: true },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new AppError(404, "Project not found");
    }

    const { subtotal, taxAmount, total } = calculateTotals(lineItems, taxRate);

    const invoiceNumber = await generateInvoiceNumber(
      workspaceId,
      project.workspace.invoicePrefix,
    );

    const invoice = await prisma.invoice.create({
      data: {
        workspaceId,
        projectId,
        invoiceNumber,
        lineItems,
        subtotal,
        taxRate,
        taxAmount,
        total,
        currency,
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        notes,
      },
      include: {
        project: {
          include: { client: true },
        },
      },
    });

    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
};

export const getInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = req.workspace!.id;
    const { projectId, status } = req.query;

    const validStatuses = [
      "DRAFT",
      "SENT",
      "VIEWED",
      "PAID",
      "OVERDUE",
      "CANCELLED",
    ];
    if (status && !validStatuses.includes(status as string)) {
      throw new AppError(400, "Invalid status");
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        workspaceId,
        ...(projectId && { projectId: projectId as string }),
        ...(status && { status: status as InvoiceStatus }),
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
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(invoices);
  } catch (err) {
    next(err);
  }
};

export const getInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        project: {
          include: { client: true },
        },
        reminders: {
          orderBy: { scheduledFor: "asc" },
        },
      },
    });

    if (!invoice || invoice.workspaceId !== workspaceId) {
      throw new AppError(404, "Invoice not found");
    }

    res.json(invoice);
  } catch (err) {
    next(err);
  }
};

export const updateInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;
    const { lineItems, taxRate, dueDate, notes, currency } = req.body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { project: { include: { workspace: true } } },
    });

    if (!invoice || invoice.workspaceId !== workspaceId) {
      throw new AppError(404, "Invoice not found");
    }

    if (invoice.status !== "DRAFT") {
      throw new AppError(400, "Only draft invoices can be edited");
    }

    // recalculate totals if line items changed
    let totals = {
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
    };

    if (lineItems) {
      totals = calculateTotals(lineItems, taxRate ?? invoice.taxRate);
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(lineItems && { lineItems, ...totals }),
        ...(taxRate !== undefined && { taxRate }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(notes !== undefined && { notes }),
        ...(currency && { currency }),
      },
      include: {
        project: {
          include: { client: true },
        },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const sendInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;
    const userId = req.user!.id;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        project: {
          include: { client: true },
        },
      },
    });

    if (!invoice || invoice.workspaceId !== workspaceId) {
      throw new AppError(404, "Invoice not found");
    }

    if (invoice.status !== "DRAFT") {
      throw new AppError(400, "Invoice has already been sent");
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: "SENT",
        sentBy: userId,
        sentAt: new Date(),
      },
    });

    // schedule reminders
    const dueDate = invoice.dueDate.getTime();
    const now = Date.now();

    const remindersToCreate = [];

    if (dueDate - now > 7 * 24 * 60 * 60 * 1000) {
      remindersToCreate.push({
        invoiceId: id,
        workspaceId,
        type: "INVOICE_BEFORE_7_DAYS" as const,
        scheduledFor: new Date(dueDate - 7 * 24 * 60 * 60 * 1000),
      });
    }

    if (dueDate - now > 3 * 24 * 60 * 60 * 1000) {
      remindersToCreate.push({
        invoiceId: id,
        workspaceId,
        type: "INVOICE_BEFORE_3_DAYS" as const,
        scheduledFor: new Date(dueDate - 3 * 24 * 60 * 60 * 1000),
      });
    }

    remindersToCreate.push({
      invoiceId: id,
      workspaceId,
      type: "INVOICE_OVERDUE" as const,
      scheduledFor: new Date(dueDate),
    });

    await prisma.reminder.createMany({
      data: remindersToCreate,
    });

    const invoiceWithClient = await prisma.invoice.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            client: true,
            workspace: true,
          },
        },
      },
    });

    const paymentLink = `${process.env.FRONTEND_URL}/invoice/${invoice.publicToken}`;

    if (invoiceWithClient?.project.client.email) {
      await emailQueue.add("invoice", {
        to: invoiceWithClient.project.client.email,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        dueDate: new Date(invoice.dueDate).toLocaleDateString("en-IN"),
        paymentLink,
        workspaceName: invoiceWithClient.project.workspace.name,
      });
    }

    res.json({
      ...updated,
      paymentLink,
      remindersScheduled: remindersToCreate.length,
    });
  } catch (err) {
    next(err);
  }
};

export const markAsPaid = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice || invoice.workspaceId !== workspaceId) {
      throw new AppError(404, "Invoice not found");
    }

    if (invoice.status === "PAID") {
      throw new AppError(400, "Invoice is already paid");
    }

    if (invoice.status === "CANCELLED") {
      throw new AppError(400, "Cannot mark a cancelled invoice as paid");
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    // cancel pending reminders
    await prisma.reminder.updateMany({
      where: {
        invoiceId: id,
        status: "PENDING",
      },
      data: { status: "CANCELLED" },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const cancelInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const workspaceId = req.workspace!.id;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice || invoice.workspaceId !== workspaceId) {
      throw new AppError(404, "Invoice not found");
    }

    if (invoice.status === "PAID") {
      throw new AppError(400, "Cannot cancel a paid invoice");
    }

    if (invoice.status === "CANCELLED") {
      throw new AppError(400, "Invoice is already cancelled");
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    // cancel pending reminders
    await prisma.reminder.updateMany({
      where: {
        invoiceId: id,
        status: "PENDING",
      },
      data: { status: "CANCELLED" },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};
