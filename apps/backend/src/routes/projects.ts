import { Router } from "express";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  updateProjectStatus,
} from "../controllers/projectController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.use(authenticate);

router.post("/", createProject);
router.get("/", getProjects);
router.get("/:id", getProject);
router.put("/:id", updateProject);
router.patch("/:id/status", updateProjectStatus);

export default router;
