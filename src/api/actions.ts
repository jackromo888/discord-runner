/* eslint no-return-await: "off" */

import {
  Role,
  Permissions,
  MessageEmbed,
  ThreadChannel,
  Collection,
  TextChannel,
  Message,
} from "discord.js";
import Main from "../Main";
import logger from "../utils/logger";
import {
  ChannelObj,
  CreateChannelParams,
  Emote,
  Poll,
  SendJoinMeta,
  UserResult,
} from "./types";
import {
  createJoinInteractionPayload,
  denyViewEntryChannelForRole,
  getChannelsByCategoryWithRoles,
  getUserResult,
  notifyAccessedChannels,
} from "../utils/utils";
import config from "../config";
import { createPollText } from "./polls";

const isMember = async (
  guildId: string,
  userId: string
): Promise<UserResult> => {
  const guild = await Main.client.guilds.fetch(guildId);

  const member = await guild.members.fetch(userId);

  return getUserResult(member);
};

const createChannel = async (params: CreateChannelParams) => {
  logger.verbose(`createChannel params: ${JSON.stringify(params)}`);
  const { guildId, channelName } = params;
  const guild = await Main.client.guilds.fetch(guildId);

  const createdChannel = await guild.channels.create(channelName, {
    type: "GUILD_TEXT",
    permissionOverwrites: [
      { type: "role", id: guild.roles.everyone.id, deny: "SEND_MESSAGES" },
    ],
  });

  return createdChannel;
};

const createRole = async (
  serverId: string,
  roleName: string,
  isGuard: boolean,
  entryChannelId?: string
) => {
  logger.verbose(`createRole params: ${serverId}, ${roleName}`);
  const guild = await Main.client.guilds.fetch(serverId);

  const role = await guild.roles.create({
    name: roleName,
    hoist: true,
    reason: `Created by ${Main.client.user.username} for a Guild role.`,
    permissions: Permissions.FLAGS.VIEW_CHANNEL,
  });
  logger.verbose(`role created: ${role.id}`);

  if (isGuard) {
    await denyViewEntryChannelForRole(role, entryChannelId);
  }

  return role.id;
};

const updateRoleName = async (
  serverId: string,
  roleId: string,
  newRoleName: string,
  isGuarded: boolean,
  entryChannelId?: string
) => {
  logger.verbose(
    `updateRoleName params: ${serverId}, ${roleId}, ${newRoleName}`
  );
  const guild = await Main.client.guilds.fetch(serverId);

  const role = await guild.roles.fetch(roleId);

  const updatedRole = await role.edit(
    {
      name: newRoleName,
      permissions: isGuarded ? role.permissions.add("VIEW_CHANNEL") : undefined,
    },
    `Updated by ${Main.client.user.username} because the role name has changed in Guild.`
  );

  if (isGuarded) {
    denyViewEntryChannelForRole(role, entryChannelId);
  }

  return updatedRole;
};

const getServerInfo = async (guildId: string, includeDetails: boolean) => {
  logger.verbose(`listChannels params: ${guildId}`);
  try {
    const guild = await Main.client.guilds.fetch(guildId);
    const { icon: iconId, name: serverName } = guild;
    const serverIcon =
      iconId === null
        ? ""
        : `https://cdn.discordapp.com/icons/${guildId}/${iconId}.png`;

    if (
      !guild.me.permissions.has(Permissions.FLAGS.ADMINISTRATOR) &&
      !guild.me.permissions.has(Permissions.FLAGS.MANAGE_ROLES)
    ) {
      return {
        serverIcon,
        serverName,
        serverId: guildId,
        channels: [],
        roles: [],
        isAdmin: false,
      };
    }

    const roles: Collection<string, Role> = guild?.roles.cache.filter(
      (r) => r.id !== guild.roles.everyone.id
    );

    const channels = guild?.channels.cache
      .filter(
        (c) =>
          c.type === "GUILD_TEXT" &&
          c
            .permissionsFor(guild.roles.everyone)
            .has(Permissions.FLAGS.VIEW_CHANNEL)
      )
      .map((c) => ({
        id: c?.id,
        name: c?.name,
      }));

    let categories: any[];
    if (includeDetails) {
      categories = getChannelsByCategoryWithRoles(guild);
    }

    const membersWithoutRole = guild.members.cache.reduce(
      (acc, m) =>
        m.roles.highest.id === guild.roles.everyone.id ? acc + 1 : acc,
      0
    );

    return {
      serverIcon,
      serverName,
      serverId: guildId,
      categories,
      roles,
      isAdmin: true,
      membersWithoutRole,
      channels,
    };
  } catch (error) {
    return {
      serverIcon: "",
      serverName: "",
      serverId: guildId,
      channels: [],
      roles: [],
      isAdmin: null,
      membersWithoutRole: null,
    };
  }
};

const listAdministeredServers = async (userId: string) => {
  logger.verbose(`listAdministeredServers params: ${userId}`);

  const administeredServers = Main.client.guilds.cache
    .filter((g) =>
      g.members.cache.get(userId)?.permissions.has("ADMINISTRATOR")
    )
    .map((g) => ({ name: g.name, id: g.id }));

  logger.verbose(`listAdministeredServers result: ${administeredServers}`);
  return administeredServers;
};

const getRole = async (guildId: string, roleId: string) => {
  const guild = await Main.client.guilds.fetch(guildId);
  const role = guild.roles.cache.find((r) => r.id === roleId);
  return { serverName: guild.name, roleName: role.name };
};

const sendJoinButton = async (
  guildId: string,
  channelId: string,
  meta?: SendJoinMeta
) => {
  const server = await Main.client.guilds.fetch(guildId);
  const channel = server.channels.cache.find((c) => c.id === channelId);

  if (!channel?.isText()) {
    return false;
  }

  const guildOfServer = await Main.platform.guild.get(guildId);
  const payload = createJoinInteractionPayload(
    guildOfServer,
    meta?.title,
    meta?.description,
    meta?.button
  );

  const message = await channel.send(payload);
  await message.react(config.joinButtonEmojis.emoji1);
  await message.react(config.joinButtonEmojis.emoji2);

  return true;
};

const getUser = async (userId: string) => Main.client.users.fetch(userId);

const manageMigratedActions = async (
  guildId: string,
  upgradeableUserIds: string[],
  downgradeableUserIds: string[] | "ALL",
  roleId: string,
  message: string
) => {
  const guild = await Main.client.guilds.fetch(guildId);
  const role = guild.roles.cache.find((r) => r.id === roleId);
  await Promise.all(
    upgradeableUserIds.map(async (id) => {
      const member = await guild.members.fetch(id);
      await member.roles.add(roleId);
      await notifyAccessedChannels(member, roleId, message, role.name);
    })
  );

  const membersToTakeRoleFrom = role.members.filter(
    downgradeableUserIds === "ALL"
      ? (member) => !upgradeableUserIds.includes(member.id)
      : (member) => downgradeableUserIds.includes(member.id)
  );

  await Promise.all(
    membersToTakeRoleFrom.map(async (m) => {
      if (!upgradeableUserIds.includes(m.id)) {
        await m.roles.remove(roleId);
        const embed = new MessageEmbed({
          title: `You no longer have access to the \`${message}\` role in \`${guild.name}\`, because you have not fulfilled the requirements, disconnected your Discord account or just left it.`,
          color: `#${config.embedColor}`,
        });
        try {
          await m.send({ embeds: [embed] });
        } catch (error) {
          if (error?.code === 50007) {
            logger.verbose(
              `Cannot send messages to ${m.user.username}#${m.user.discriminator}`
            );
          } else {
            logger.error(JSON.stringify(error));
          }
        }
      }
    })
  );
};

const resetGuildGuard = async (guildId: string, entryChannelId: string) => {
  logger.verbose(`Resetting guild guard, server: ${guildId}`);

  const guild = await Main.client.guilds.fetch(guildId);
  const entryChannel = guild.channels.cache.get(entryChannelId);
  if (!entryChannel) {
    throw new Error(
      `Channel with id ${entryChannelId} does not exists in server ${guildId}.`
    );
  }

  if (entryChannel instanceof ThreadChannel) {
    throw Error("Entry channel cannot be a thread.");
  }

  if (entryChannel.type === "GUILD_VOICE") {
    throw Error("Entry channel cannot be a voice channel.");
  }

  const editReason = `Updated by ${Main.client.user.username} because Guild Guard has been disabled.`;

  await entryChannel.permissionOverwrites.delete(
    guild.roles.everyone.id,
    editReason
  );

  await Promise.all(
    guild.roles.cache
      .filter((role) => !role.permissions.has("VIEW_CHANNEL"))
      .map((role) =>
        role.edit({ permissions: role.permissions.add("VIEW_CHANNEL") })
      )
  );

  await guild.roles.everyone.edit(
    {
      permissions: guild.roles.everyone.permissions.add("VIEW_CHANNEL"),
    },
    editReason
  );
};

const getMembersByRoleId = async (serverId: string, roleId: string) => {
  const server = await Main.client.guilds.fetch(serverId);

  const role = await server.roles.fetch(roleId);

  return [...role.members.keys()] || [];
};

const sendPollMessage = async (
  channelId: string,
  poll: Poll
): Promise<number> => {
  const { id, question } = poll;

  const channel = (await Main.client.channels.fetch(channelId)) as TextChannel;

  const embed = new MessageEmbed({
    title: `Poll #${id}: ${question}`,
    color: `#${config.embedColor}`,
    description: await createPollText(poll),
  });

  const msg = await channel.send({ embeds: [embed] });

  poll.reactions.map(async (emoji) => await (msg as Message).react(emoji));

  return +msg.id;
};

const getEmoteList = async (guildId: string): Promise<Emote[]> => {
  const guild = await Main.client.guilds.fetch(guildId);
  const emotes = await guild.emojis.fetch();

  return emotes.map((emote) => ({
    name: emote.name,
    id: emote.id,
    image: emote.url,
    animated: emote.animated,
  }));
};

const getChannelList = async (guildId: string): Promise<ChannelObj[]> => {
  const guild = await Main.client.guilds.fetch(guildId);
  const channels = await guild.channels.fetch();

  return channels
    .filter((channel) => !channel.type.match(/^GUILD_(CATEGORY|VOICE)$/))
    .map((channel) => ({
      name: channel.name,
      id: channel.id,
    }));
};

export {
  getMembersByRoleId,
  manageMigratedActions,
  isMember,
  createRole,
  updateRoleName,
  getServerInfo,
  listAdministeredServers,
  createChannel,
  getRole,
  sendJoinButton,
  getUser,
  sendPollMessage,
  getEmoteList,
  getChannelList,
  resetGuildGuard,
};
