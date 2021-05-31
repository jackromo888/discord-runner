import { body } from "express-validator";

export default {
  guildIdValidator: body("guildId").trim().isLength({ min: 18, max: 18 }),
  userIdValidator: body("userId").trim().isLength({ min: 18, max: 18 }),
  roleIdsValidator: body("roleIds").isArray({ min: 1 }),
  messageValidator: body("message").trim().isLength({ min: 1 }),
};
