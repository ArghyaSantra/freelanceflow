import { Router } from "express";
import {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
} from "../controllers/clientController";
import { authenticate } from "../middleware/auth";

const router = Router();

// all client routes require authentication
router.use(authenticate);

router.post("/", createClient);
router.get("/", getClients);
router.get("/:id", getClient);
router.put("/:id", updateClient);
router.delete("/:id", deleteClient);

export default router;
