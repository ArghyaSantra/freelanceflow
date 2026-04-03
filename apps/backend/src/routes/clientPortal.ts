import { Router } from "express";
import { authenticateClient } from "../middleware/clientAuth";
import {
  getClientDocuments,
  getClientDocument,
  getClientInvoices,
  getClientInvoice,
  getClientAssets,
  approveAsset,
  rejectAsset,
  addAssetComment,
} from "../controllers/clientPortalController";

const router = Router();

router.use(authenticateClient);

// Documents
router.get("/documents", getClientDocuments);
router.get("/documents/:id", getClientDocument);

// Invoices
router.get("/invoices", getClientInvoices);
router.get("/invoices/:id", getClientInvoice);

// Assets
router.get("/assets", getClientAssets);
router.post("/assets/:id/approve", approveAsset);
router.post("/assets/:id/reject", rejectAsset);
router.post("/assets/:id/comments", addAssetComment);

export default router;
