import express from "express";
import { getCatalogo, getCatalogoBatch } from "../controllers/catalogoController.js";

const router = express.Router();

router.get("/", getCatalogo);
router.post("/batch", getCatalogoBatch);

export default router;
