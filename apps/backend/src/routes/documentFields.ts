import { Router } from "express";
import {
  createDocumentField,
  getDocumentFields,
  deleteDocumentField,
  sendDocument,
} from "../controllers/documentFieldController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/:id/fields", createDocumentField);
router.get("/:id/fields", getDocumentFields);
router.delete("/:id/fields/:fieldId", deleteDocumentField);
router.post("/:id/send", sendDocument);

export default router;
