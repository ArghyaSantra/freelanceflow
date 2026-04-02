import { Router } from "express";
import {
  getDocumentByToken,
  signDocument,
  getInvoiceByToken,
} from "../controllers/publicController";

const router = Router();

// no authentication required on these routes
router.get("/sign/:token", getDocumentByToken);
router.post("/sign/:token", signDocument);
router.get("/invoice/:token", getInvoiceByToken);

export default router;
