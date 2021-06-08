import { Router } from "express";
import controller from "./controller";
import validators from "./validators";

export default () => {
  const router: Router = Router();

  router.post(
    "/upgrade",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("userId"),
    validators.roleIdsArrayValidator,
    validators.bodyDiscordId("roleIds.*"),
    validators.messageValidator,
    controller.upgrade
  );

  router.post(
    "/downgrade",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("userId"),
    validators.roleIdsArrayValidator,
    validators.bodyDiscordId("roleIds.*"),
    validators.messageValidator,
    controller.downgrade
  );

  router.get(
    "/invite/:guildId",
    validators.paramDiscordId("guildId"),
    controller.getInvite
  );

  router.get(
    "/isMember/:guildId/:userId",
    validators.paramDiscordId("guildId"),
    validators.paramDiscordId("userId"),
    controller.isMember
  );

  return router;
};
