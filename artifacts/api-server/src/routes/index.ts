import { Router, type IRouter } from "express";
import healthRouter from "./health";
import driveRouter from "./drive";
import xmixRouter from "./xmix";

const router: IRouter = Router();

router.use(healthRouter);
router.use(driveRouter);
router.use(xmixRouter);

export default router;
