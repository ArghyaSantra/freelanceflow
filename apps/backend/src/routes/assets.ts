import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  getAssetUploadUrl,
  createAsset,
  getAssets,
  getAsset,
  deleteAsset,
  addFreelancerComment,
} from "../controllers/assetController";

const router = Router();

router.use(authenticate);

router.post("/upload-url", getAssetUploadUrl);
router.post("/", createAsset);
router.get("/", getAssets);
router.get("/:id", getAsset);
router.delete("/:id", deleteAsset);
router.post("/:id/comments", addFreelancerComment);

export default router;
