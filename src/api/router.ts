import { Router } from "express";
import { body } from "express-validator";
import controller from "./controller";
import validators from "./validators";

const createRouter = () => {
  const router: Router = Router();
  router.post(
    "/access",
    body("*.action").isIn(["ADD", "REMOVE"]),
    validators.bodyDiscordId("*.platformUserId"),
    validators.bodyDiscordId("*.platformGuildId"),
    validators.bodyStringValidator("*.guildName"),
    body("*.platformGuildData"),
    validators.bodyArrayValidator("*.roles"),
    validators.bodyStringValidator("*.roles.*.roleName"),
    validators.bodyDiscordId("*.roles.*.platformRoleId"),
    validators
      .bodyDiscordId("*.roles.*.platformRoleData.inviteChannel")
      .optional(),
    controller.access
  );

  router.post(
    "/guild",
    body("action").isIn(["CREATE", "UPDATE", "DELETE"]),
    validators.bodyDiscordId("platformGuildId"),
    body("platformGuildData").optional(),
    controller.guild
  );

  router.post(
    "/role",
    body("action").isIn(["CREATE", "UPDATE", "DELETE"]),
    validators.bodyDiscordId("platformGuildId"),
    body("platformGuildData").optional(),
    validators.bodyDiscordId("platformRoleId").optional(),
    body("platformRoleData").optional(),
    controller.role
  );

  router.get(
    "/info/:platformGuildId",
    validators.paramDiscordId("platformGuildId"),
    controller.info
  );

  router.post(
    "/resolveUser",
    validators.bodyStringValidator("access_token"),
    controller.resolveUser
  );

  router.get(
    "/listGateables/:platformUserId",
    validators.paramDiscordId("platformUserId"),
    controller.listGateables
  );

  router.post(
    "/manageMigratedActions",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("roleId"),
    validators.messageValidator,
    controller.manageMigratedActions
  );

  router.post(
    "/isMember",
    validators.bodyDiscordId("serverId"),
    validators.bodyDiscordId("platformUserId"),
    controller.isMember
  );

  // called before guild creation in fronend, to get info of the server
  router.post(
    "/server/:guildId",
    validators.paramDiscordId("guildId"),
    controller.server
  );

  // called when BE's /sendJoin endpoint needs to create az inviteChannel
  router.post(
    "/channels/create",
    validators.bodyDiscordId("guildId"),
    validators.channelNameValidator,
    controller.createChannel
  );

  // called when BE's /sendJoin endpoint needs to send the join button to the inviteChannel
  router.post(
    "/channels/sendJoin",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("channelId"),
    ...validators.sendJoinMeta,
    controller.sendJoinButtonToChannel
  );

  router.get(
    "/user/:platformUserId",
    validators.paramDiscordId("platformUserId"),
    controller.getUser
  );

  router.get(
    "/members/:serverId/:roleId",
    validators.paramDiscordId("roleId"),
    validators.paramDiscordId("serverId"),
    controller.getMembersByRole
  );

  router.post(
    "/poll",
    [
      validators.bodyNumberIdValidator("id"),
      validators.bodyIdValidator("platformId"),
      validators.bodyStringValidator("question"),
      validators.bodyIdValidator("expDate"),
      validators.bodyArrayValidator("options"),
    ],
    controller.createPoll
  );

  router.get(
    "/emotes/:guildId",
    validators.paramDiscordId("guildId"),
    controller.getEmotes
  );

  router.get(
    "/channels/:guildId",
    validators.paramDiscordId("guildId"),
    controller.getChannels
  );

  return router;
};

export default createRouter;
