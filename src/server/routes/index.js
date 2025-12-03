import express from "express";
import authRoutes from "./authRoutes.js";
import catalogoRoutes from "./catalogoRoutes.js";
import dominiosRoutes from "./dominiosRoutes.js";
import inspecaoRoutes from "./inspecaoRoutes.js";
import oportunidadeRoutes from "./oportunidadeRoutes.js";
import uiRoutes from "./uiRoutes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/catalogos", catalogoRoutes);
router.use("/dominios", dominiosRoutes);
router.use("/ui", uiRoutes);
router.use("/", oportunidadeRoutes);
router.use("/", inspecaoRoutes);

export default router;
