import { Router } from "express";
import { body } from "express-validator";
import controller from "./controller";

export default () => {
  const router: Router = Router();

  router.post(
    "/upgrade",
    body("guildId").trim().isLength({ min: 18, max: 18 }),
    body("userId").trim().isLength({ min: 18, max: 18 }),
    body("roleIds").isArray({ min: 1 }),
    body("message").trim().isLength({ min: 1 }),
    controller.upgrade
  );

  return router;
};
