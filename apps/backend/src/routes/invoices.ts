import { Router } from "express";
import {
  createInvoice,
  getInvoices,
  getInvoice,
  updateInvoice,
  sendInvoice,
  markAsPaid,
  cancelInvoice,
} from "../controllers/invoiceController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoice);
router.put("/:id", updateInvoice);
router.post("/:id/send", sendInvoice);
router.post("/:id/mark-paid", markAsPaid);
router.post("/:id/cancel", cancelInvoice);

export default router;
