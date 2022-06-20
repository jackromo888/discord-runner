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

  router.get(
    "/role/:guildId/:roleId",
    validators.paramDiscordId("guildId"),
    validators.paramDiscordId("roleId"),
    controller.getRoleNameByRoleId
  );

  router.post(
    "/role",
    validators.bodyDiscordId("serverId"),
    validators.roleNameValidator,
    validators.isGuardedValidator,
    validators.entryChannelIdValidator,
    controller.createRole
  );

  router.patch(
    "/role",
    validators.bodyDiscordId("serverId"),
    validators.bodyDiscordId("roleId"),
    validators.roleNameValidator,
    validators.isGuardedValidator,
    validators.entryChannelIdValidator,
    validators.gatedChannelsValidator,
    controller.updateRole
  );

  router.post(
    "/role/delete",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("roleId"),
    controller.deleteRole
  );

  router.post(
    "/guard",
    validators.bodyDiscordId("serverId"),
    validators.entryChannelIdValidator,
    validators.roleIdsArrayValidator,
    controller.createGuildGuard
  );

  router.post(
    "/resetguard",
    validators.bodyDiscordId("serverId"),
    validators.entryChannelIdValidator,
    controller.resetGuildGuard
  );

  router.get(
    "/isIn/:guildId",
    validators.paramDiscordId("guildId"),
    controller.isIn
  );

  router.post(
    "/server/:guildId",
    validators.paramDiscordId("guildId"),
    controller.server
  );

  router.post(
    "/channels/sendJoin",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("channelId"),
    ...validators.sendJoinMeta,
    controller.sendJoinButtonToChannel
  );

  router.post(
    "/channels/create",
    validators.bodyDiscordId("guildId"),
    validators.channelNameValidator,
    controller.createChannel
  );

  router.post(
    "/channels/delete",
    validators.bodyDiscordId("guildId"),
    validators.bodyDiscordId("roleId"),
    validators.bodyDiscordId("channelId"),
    controller.deleteChannelAndRole
  );

  router.get(
    "/administeredServers/:platformUserId",
    validators.paramDiscordId("platformUserId"),
    controller.administeredServers
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
