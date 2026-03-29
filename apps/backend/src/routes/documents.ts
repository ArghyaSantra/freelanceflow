import { Router } from "express";
import {
  getUploadUrl,
  createDocument,
  getDocuments,
  getDocument,
} from "../controllers/documentController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/upload-url", getUploadUrl);
router.post("/", createDocument);
router.get("/", getDocuments);
router.get("/:id", getDocument);

export default router;
