import { Router } from "express";
import {
  getDocumentByToken,
  signDocument,
} from "../controllers/publicController";

const router = Router();

// no authentication required on these routes
router.get("/sign/:token", getDocumentByToken);
router.post("/sign/:token", signDocument);

export default router;
