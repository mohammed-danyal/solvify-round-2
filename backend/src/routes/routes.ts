import { Router } from "express";
import { signup, login } from "../controllers/auth.controllers";
import { protect } from "../middlewares/auth.middlewares";
import  prisma  from "../lib/prisma";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);

export default router;