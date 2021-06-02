import { body } from "express-validator";

export default {
  guildIdValidator: body("guildId")
    .isString()
    .trim()
    .isLength({ min: 18, max: 18 }),
  userIdValidator: body("userId")
    .isString()
    .trim()
    .isLength({ min: 18, max: 18 }),
  roleIdsArrayValidator: body("roleIds").isArray({ min: 1 }),
  roleIdsElementValidator: body("roleIds.*")
    .isString()
    .trim()
    .isLength({ min: 18, max: 18 }),
  messageValidator: body("message").isString().trim().isLength({ min: 1 }),
};
