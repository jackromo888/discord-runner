import { GetGuildResponse } from "@guildxyz/sdk";
import axios from "axios";
import { GuildMember, MessageEmbed, PermissionOverwrites } from "discord.js";
import config from "../config";
import redisClient from "../database";
import Main from "../Main";
import logger from "../utils/logger";
import {
  getJoinReplyMessage,
  getUserResult,
  notifyAccessedChannels,
} from "../utils/utils";
import { AccessEventParams, UserResult, InviteResult } from "./types";

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
      roleIds,
      member.guild,
      member.id
    );

    try {
      await axios.patch(
        `https://discord.com/api/v8/webhooks/${Main.client.application.id}/${redisValue}/messages/@original`,
        { content: messageText }
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
    if (!member.roles.cache.hasAll(...roleIds)) {
      updatedMember = await member.roles.add(roleIds);
      // notify user about new roles
      try {
        await Promise.all(
          roleIds.map((roleId) =>
            notifyAccessedChannels(updatedMember, roleId, guildName)
          )
        );
      } catch (error) {
        logger.error(error);
      }
    }
  }

  if (action === "REMOVE") {
    // check if user would lose any role
    if (member.roles.cache.hasAny(...roleIds)) {
      updatedMember = await member.roles.remove(roleIds);

      // notify user about removed roles
      const embed = new MessageEmbed({
        title: `You no longer have access to the \`${guildName}\` role in \`${guild.name}\`, because you have not fulfilled the requirements, disconnected your Discord account or just left it.`,
        color: `#${config.embedColor}`,
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

const getInvite = async (serverId: string): Promise<InviteResult> => {
  logger.verbose(`generateInvite params: ${serverId}`);

  // check if invite is in cache
  const cachedInvite = Main.inviteDataCache.get(serverId);
  if (cachedInvite) {
    logger.verbose(`returning cached invite code: ${cachedInvite?.code}`);
    return {
      code: cachedInvite.code,
    };
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

  // check if invite channel exists
  let channelId: string;
  if (server.channels.cache.find((c) => c.id === inviteChannelInDb)) {
    channelId = inviteChannelInDb;
  } else {
    logger.warn(
      `Invite channel in db: ${inviteChannelInDb} does not exist in server ${serverId}`
    );

    // find the first channel which is visible to everyone
    const publicChannel = server.channels.cache.find(
      (c) =>
        c.isText() &&
        !(c as any).permissionOverwrites?.cache.some(
          (po: PermissionOverwrites) =>
            po.id === server.roles.everyone.id && po.deny.any("VIEW_CHANNEL")
        )
    );
    if (publicChannel) {
      channelId = publicChannel.id;
    } else {
      // if there are no visible channels, find the first text channel
      logger.verbose(`Cannot find public channel in ${serverId}`);
      channelId = server.channels.cache.find((c) => c.isText())?.id;
    }
  }

  // generate the new invite
  const newInvite = await server.invites.create(channelId, { maxAge: 0 });
  logger.verbose(`generated invite code: ${newInvite?.code}`);

  // update cache
  Main.inviteDataCache.set(serverId, {
    code: newInvite.code,
    inviteChannelId: channelId,
  });
  return {
    code: newInvite.code,
  };
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

export { handleAccessEvent, getInvite, getServerName };
