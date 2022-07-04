import { GetGuildResponse } from "@guildxyz/sdk";
import axios from "axios";
import { GuildMember, MessageEmbed, Permissions, Role } from "discord.js";
import config from "../config";
import redisClient from "../database";
import Main from "../Main";
import logger from "../utils/logger";
import {
  checkInviteChannel,
  getJoinReplyMessage,
  getUserResult,
  notifyAccessedChannels,
  updateAccessedChannelsOfRole,
} from "../utils/utils";
import {
  AccessEventParams,
  UserResult,
  GuildEventParams,
  GuildEventResponse,
  RoleEventParams,
  RoleEventResponse,
  ResolveUserResopnse,
} from "./types";

const handleAccessEvent = async (
  params: AccessEventParams
): Promise<UserResult> => {
  logger.verbose(`manageRoles params: ${JSON.stringify(params)}`);
  const { platformGuildId, platformUserId, guildName, action, roles } = params;
  const roleIds = roles.map((r) => r.platformRoleId);

  // find the guild
  const guild = await Main.client.guilds.fetch(platformGuildId);

  // find the member
  const member = await guild.members.fetch(platformUserId);

  // update join interaction reply if exists
  const redisKey = `joining:${member.guild.id}:${member.id}`;
  const redisValue: string = await redisClient.getAsync(redisKey);
  if (redisValue) {
    const messageText = await getJoinReplyMessage(
      member.guild,
      member.id,
      roleIds,
      null
    );

    try {
      await axios.patch(
        `https://discord.com/api/v8/webhooks/${Main.client.application.id}/${redisValue}/messages/@original`,
        { content: messageText.content },
        { headers: { "Content-Type": "application/json" } }
      );
      redisClient.client.del(redisKey);
    } catch (err) {
      logger.verbose(`Update join interaction reply error: ${err.message}`);
    }
  }

  // update member roles
  let updatedMember: GuildMember;
  if (action === "ADD") {
    // check if user would get a new role
    const rolesToAdd = roleIds.filter((r) => !member.roles.cache.has(r));
    if (rolesToAdd.length > 0) {
      updatedMember = await member.roles.add(rolesToAdd);

      // notify user about new roles
      try {
        await Promise.all(
          rolesToAdd.map((roleId) =>
            notifyAccessedChannels(
              updatedMember,
              roleId,
              guildName,
              guild.roles.cache.find((r) => r.id === roleId)?.name
            )
          )
        );
      } catch (error) {
        logger.error(error);
      }
    }
  }

  if (action === "REMOVE") {
    // check if user would lose any role
    const rolesToRemove = member.roles.cache.filter((r) =>
      roleIds.includes(r.id)
    );
    if (rolesToRemove.size > 0) {
      updatedMember = await member.fetch();

      // notify user about removed roles
      const embed = new MessageEmbed({
        title: `You no longer have access to the \`${rolesToRemove
          .map((r) => r.name)
          .join(",")}\` role${rolesToRemove.size > 1 ? "s" : ""} in \`${
          guild.name
        }\`, because you have not fulfilled the requirements, disconnected your Discord account or just left it.`,
        color: `#${config.embedColor.default}`,
      });
      try {
        await updatedMember.send({ embeds: [embed] });
      } catch (error) {
        if (error?.code === 50007) {
          logger.verbose(
            `Cannot send messages to ${updatedMember.user.username}#${updatedMember.user.discriminator}`
          );
        } else {
          logger.error(JSON.stringify(error));
        }
      }
    }
  }

  if (updatedMember) {
    return getUserResult(updatedMember);
  }

  return getUserResult(member);
};

const handleGuildEvent = async (
  params: GuildEventParams
): Promise<GuildEventResponse> => {
  const { action, platformGuildId, platformGuildData } = params;

  switch (action) {
    case "CREATE":
    case "UPDATE": {
      const server = await Main.client.guilds.fetch(platformGuildId);

      // check if invite channel exists, if not select another one
      const inviteChannelId = checkInviteChannel(
        server,
        platformGuildData?.inviteChannel
      );

      return {
        platformGuildId,
        platformGuildData: { inviteChannel: inviteChannelId },
      };
    }
    case "DELETE": {
      return {
        platformGuildId,
        platformGuildData: platformGuildData as any,
      };
    }

    default:
      throw Error(`Invalid guild event: ${JSON.stringify(params)}`);
  }
};

const handleRoleEvent = async (
  params: RoleEventParams
): Promise<RoleEventResponse> => {
  const {
    action,
    roleName,
    platformGuildId,
    platformGuildData,
    platformRoleId,
    platformRoleData,
  } = params;

  switch (action) {
    case "CREATE": {
      // create the discord role
      const server = await Main.client.guilds.fetch(platformGuildId);
      const createdRole = await server.roles.create({
        name: roleName,
        hoist: true,
        reason: `Created by ${Main.client.user.username} for a Guild role.`,
        permissions:
          platformRoleData?.isGuarded === true
            ? Permissions.FLAGS.VIEW_CHANNEL
            : undefined,
      });

      // check if invite channel exists, if not select another one
      const inviteChannelId = checkInviteChannel(
        server,
        platformGuildData.inviteChannel
      );

      // if guarded, hide invite channel for role
      if (platformRoleData?.isGuarded === true) {
        const inviteChannel = await server.channels.fetch(inviteChannelId);
        await inviteChannel.permissionOverwrites.create(createdRole, {
          VIEW_CHANNEL: false,
        });
        await inviteChannel.permissionOverwrites.create(server.roles.everyone, {
          VIEW_CHANNEL: true,
        });
        await server.roles.everyone.setPermissions(
          server.roles.everyone.permissions.remove("VIEW_CHANNEL")
        );

        // if grantAccessToExistingUsers, give everyone this role
        if (params.platformRoleData.grantAccessToExistingUsers) {
          await Promise.all(
            server.members.cache.map(async (m) => {
              if (!m.roles.cache.has(createdRole.id)) {
                try {
                  await m.roles.add(createdRole);
                } catch (error) {
                  logger.verbose(
                    `Couldn't give role to ${m.id} in ${server.id} (${error.message})`
                  );
                }
              }
            })
          );
        }
      }

      await updateAccessedChannelsOfRole(
        server,
        createdRole.id,
        platformRoleData?.gatedChannels,
        platformRoleData?.isGuarded === true,
        inviteChannelId
      );

      return {
        platformRoleId: createdRole.id,
        platformGuildData: { inviteChannel: inviteChannelId },
      };
    }

    case "UPDATE": {
      // update role name
      const server = await Main.client.guilds.fetch(platformGuildId);
      const roleInServer = server.roles.cache.find(
        (r) => r.id === platformRoleId
      );

      // check if role exists
      let role: Role;
      if (roleInServer) {
        role = await roleInServer.edit(
          {
            name: roleName,
            permissions:
              platformRoleData?.isGuarded === true
                ? Permissions.FLAGS.VIEW_CHANNEL
                : undefined,
          },
          `Updated by ${Main.client.user.username} because the role name has changed in Guild.`
        );
      } else {
        // if not exists create a new
        role = await server.roles.create({
          name: roleName,
          hoist: true,
          reason: `Created by ${Main.client.user.username} for a Guild role.`,
          permissions:
            platformRoleData?.isGuarded === true
              ? Permissions.FLAGS.VIEW_CHANNEL
              : undefined,
        });
      }

      // check if invite channel exists, if not select another one
      const inviteChannelId = checkInviteChannel(
        server,
        platformGuildData.inviteChannel
      );

      // if guarded hide invite channel for role
      if (platformRoleData?.isGuarded === true) {
        const inviteChannel = await server.channels.fetch(inviteChannelId);
        inviteChannel.permissionOverwrites.create(role, {
          VIEW_CHANNEL: false,
        });
        await inviteChannel.permissionOverwrites.create(role, {
          VIEW_CHANNEL: false,
        });
        await inviteChannel.permissionOverwrites.create(server.roles.everyone, {
          VIEW_CHANNEL: true,
        });
        await server.roles.everyone.setPermissions(
          server.roles.everyone.permissions.remove("VIEW_CHANNEL")
        );

        // if grantAccessToExistingUsers, give everyone this role
        if (params.platformRoleData.grantAccessToExistingUsers) {
          await Promise.all(
            server.members.cache.map(async (m) => {
              if (!m.roles.cache.has(role.id)) {
                try {
                  await m.roles.add(role);
                } catch (error) {
                  logger.verbose(
                    `Couldn't give role to ${m.id} in ${server.id} (${error.message})`
                  );
                }
              }
            })
          );
        }
      }

      if (platformRoleData?.gatedChannels) {
        await updateAccessedChannelsOfRole(
          server,
          role.id,
          platformRoleData.gatedChannels,
          platformRoleData?.isGuarded === true,
          inviteChannelId
        );
      }

      return {
        platformGuildData: { inviteChannel: inviteChannelId },
        platformRoleId: role.id,
      };
    }
    case "DELETE": {
      // find the role
      const server = await Main.client.guilds.fetch(platformGuildId);
      const role = server.roles.cache.find((r) => r.id === platformRoleId);

      // delete the role
      try {
        await role.delete(
          `Deleted by ${Main.client.user.username} because the role deleted in Guild`
        );
      } catch (error) {
        logger.verbose(`Role delete error: ${error.message}`);
        return { success: false };
      }

      return {
        success: true,
      };
    }

    default:
      throw Error(`Invalid role event: ${JSON.stringify(params)}`);
  }
};

const getInvite = async (serverId: string) => {
  logger.verbose(`getInvite params: ${serverId}`);

  // check if invite is in cache
  const cachedInvite = Main.inviteDataCache.get(serverId);
  if (cachedInvite) {
    logger.verbose(`returning cached invite code: ${cachedInvite.code}`);
    return `https://discord.gg/${cachedInvite.code}`;
  }

  // find the server
  const server = await Main.client.guilds.fetch(serverId);

  // get the guild of the server
  let guildOfServer: GetGuildResponse;
  try {
    guildOfServer = await Main.platform.guild.get(serverId);
  } catch (error) {
    if (error.response?.status === 204) {
      throw new Error(`No guild belongs to this server: ${serverId}`);
    }
    throw error;
  }

  const inviteChannelInDb = guildOfServer?.guildPlatforms?.find(
    (gp) => gp.platformGuildId === serverId
  )?.data?.inviteChannel;

  const channelId = checkInviteChannel(server, inviteChannelInDb);
  // TODO: update in db

  // generate the new invite
  const newInvite = await server.invites.create(channelId, { maxAge: 0 });
  logger.verbose(`generated invite code: ${newInvite?.code}`);

  // update cache
  Main.inviteDataCache.set(serverId, {
    code: newInvite.code,
    inviteChannelId: channelId,
  });

  return newInvite.url;
};

const DiscordServerNames: { [guildId: string]: [name: string] } = {};

const getServerName = async (guildId: string) => {
  if (DiscordServerNames[guildId]) {
    return DiscordServerNames[guildId];
  }
  const guild = await Main.client.guilds.fetch(guildId);
  DiscordServerNames[guildId] = guild.name as any;
  return guild.name;
};

const fetchUserByAccessToken = async (
  accessToken: string
): Promise<ResolveUserResopnse> => {
  try {
    const apiResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return {
      platformUserId: apiResponse.data.id,
      platformUserData: { access_token: accessToken },
    };
  } catch (error) {
    throw Error(
      `reolveUser: cannot fetch user from access_token. ${JSON.stringify(
        JSON.stringify(error.response.data)
      )}`
    );
  }
};

const listServers = async (userId: string) => {
  const mutualServers = Main.client.guilds.cache.filter((g) =>
    g.members.cache.has(userId)
  );
  const serverDatas = mutualServers.reduce((acc: any, guild) => {
    acc[guild.id] = {
      name: guild.name,
      iconURL: guild.iconURL(),
      bannerURL: guild.bannerURL(),
    };
    return acc;
  }, {});

  return serverDatas;
};

export {
  handleAccessEvent,
  getInvite,
  getServerName,
  listServers,
  handleGuildEvent,
  handleRoleEvent,
  fetchUserByAccessToken,
};
