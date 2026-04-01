import { Router } from "express";
import { updateWorkspace } from "../controllers/workspaceController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.put("/", updateWorkspace);

export default router;
