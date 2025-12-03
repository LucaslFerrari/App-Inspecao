import express from "express";
import { getInspecaoCampos } from "../controllers/uiController.js";

const router = express.Router();

router.get("/inspecao-campos", getInspecaoCampos);

export default router;
