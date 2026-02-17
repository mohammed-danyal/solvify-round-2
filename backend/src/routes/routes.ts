import { Router } from "express";
import { signup, login } from "../controllers/auth.controllers";
import { protect } from "../middlewares/auth.middlewares";
import { useScrapperController } from "../controllers/scrapper.contoller";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/scrapper", protect, useScrapperController);


export default router;