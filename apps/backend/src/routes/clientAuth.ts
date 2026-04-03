import { Router } from "express";
import {
  clientRegister,
  clientLogin,
  clientLogout,
  clientMe,
  getInvitation,
} from "../controllers/clientAuthController";
import { authenticateClient } from "../middleware/clientAuth";

const router = Router();

router.post("/register", clientRegister);
router.post("/login", clientLogin);
router.post("/logout", clientLogout);
router.get("/me", authenticateClient, clientMe);
router.get("/invitation/:token", getInvitation);

export default router;
