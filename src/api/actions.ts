/* eslint-disable no-unused-vars */
/* eslint no-return-await: "off" */

import axios from "axios";
import dayjs from "dayjs";
import {
  ActionRowBuilder,
  BaseMessageOptions,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Collection,
  EmbedBuilder,
  Message,
  MessageActionRowComponentBuilder,
  OverwriteType,
  Role,
  TextChannel,
  ThreadChannel,
} from "discord.js";
import config from "../config";
import Main from "../Main";
import logger from "../utils/logger";
import {
  createInteractionPayload,
  denyViewEntryChannelForRole,
  getBackendErrorMessage,
  getChannelsByCategoryWithRoles,
  getDiscordRoleIds,
  getUserResult,
  notifyAccessedChannels,
} from "../utils/utils";
import { createPollText } from "./polls";
import {
  ButtonMetaData,
  ChannelObj,
  CreateChannelParams,
  Emote,
  Poll,
  UserResult,
} from "./types";

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

  const createdChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        type: OverwriteType.Role,
        deny: "SendMessages",
      },
      {
        id: Main.client.user.id,
        type: OverwriteType.Member,
        allow: [
          "ViewChannel",
          "SendMessages",
          "EmbedLinks",
          "AddReactions",
          "UseExternalEmojis",
          "ReadMessageHistory",
        ],
      },
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
    permissions: "ViewChannel",
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

  const updatedRole = await role.edit({
    name: newRoleName,
    permissions: isGuarded ? role.permissions.add("ViewChannel") : undefined,
    reason: `Updated by ${Main.client.user.username} because the role name has changed in Guild.`,
  });

  if (isGuarded) {
    denyViewEntryChannelForRole(role, entryChannelId);
  }

  return updatedRole;
};

const getServerInfo = async (guildId: string) => {
  logger.verbose(`listChannels params: ${guildId}`);
  // TODO rethink includeDetails & isAdmin property
  try {
    const guild = await Main.client.guilds.fetch(guildId);
    const { icon: iconId, name: serverName } = guild;
    const serverIcon =
      iconId === null
        ? ""
        : `https://cdn.discordapp.com/icons/${guildId}/${iconId}.png`;

    if (!guild.members.me.permissions.has("ManageRoles")) {
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
          c.isTextBased() &&
          c.permissionsFor(guild.roles.everyone).has("ViewChannel")
      )
      .map((c) => ({
        id: c?.id,
        name: c?.name,
      }));

    const categories: any[] = getChannelsByCategoryWithRoles(guild);

    // logger.verbose(`before reduce ${guild.id}`);
    // const membersWithoutRole = guild.members.cache.reduce(
    //   (acc, m) =>
    //     m.roles.highest.id === guild.roles.everyone.id ? acc + 1 : acc,
    //   0
    // );
    // logger.verbose(`after reduce ${guild.id}`);
    const membersWithoutRole = 0;

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
      g.members.cache.get(userId)?.permissions.has("Administrator")
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

const getUserPoap = async (
  userId: string,
  serverId: string
): Promise<BaseMessageOptions> => {
  try {
    const errorTexts = ["claimable", "expired", "left", "requirements"];
    const guild = await Main.platform.guild.get(serverId);
    const poapLinks = await Promise.all(
      guild?.poaps
        ?.sort((a, b) => b.id - a.id)
        .filter(
          (p) => p.activated && dayjs().isBefore(dayjs.unix(p.expiryDate))
        )
        .map(async (poap) => {
          try {
            const response = await axios.post(
              `${config.backendUrl}/assets/poap/claim`,
              {
                userId,
                // eslint-disable-next-line no-unsafe-optional-chaining
                poapId: poap.poapIdentifier,
              }
            );

            return new ButtonBuilder()
              .setLabel(`Claim ${poap.fancyId}`.slice(0, 80))
              .setStyle(ButtonStyle.Link)
              .setURL(response.data);
          } catch (err: any) {
            const errorMessage = getBackendErrorMessage(err);
            logger.warn(`poapClaim - ${userId} ${errorMessage} `);

            if (errorTexts.some((e) => errorMessage.includes(e))) {
              return errorMessage;
            }

            return new ButtonBuilder()
              .setLabel(`Join ${poap.fancyId}`.slice(0, 80))
              .setStyle(ButtonStyle.Link)
              .setURL(
                `https://guild.xyz/${guild.urlName}/claim-poap/${poap.fancyId}`
              );
          }
        })
    );
    const contentMessage =
      guild?.poaps?.length > 1
        ? "These are **your** links"
        : "This is **your** link";

    if (poapLinks.length === 0) {
      return {
        content: "There is no claimable POAP right now. Check back later!",
      };
    }

    if (poapLinks.every((pl) => typeof pl === "string")) {
      return {
        content: poapLinks[0],
      };
    }

    logger.verbose(`poapLinks - ${JSON.stringify(poapLinks)}`);

    const buttonData = poapLinks.some((p) => p?.label?.includes("Join"))
      ? {
          content: `This is your Join link for this Guild. Before you claim your POAP, you have to join.Do **NOT** share it with anyone!`,
        }
      : {
          content: `${contentMessage} to your POAP(s). Do **NOT** share it with anyone!`,
        };

    return {
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
          poapLinks.slice(0, 5)
        ),
      ],
      content: buttonData.content,
    };
  } catch (err: any) {
    const errorMessage = getBackendErrorMessage(err);

    if (errorMessage) {
      logger.verbose(`getUserPoap error: ${errorMessage}`);
      return {
        content: errorMessage,
      };
    }
    logger.verbose(`getUserPoap error: ${err.message}`);

    return {
      content: `Unfortunately, you couldn't claim this POAP right now. Check back later!`,
    };
  }
};

const sendDiscordButton = async (
  guildId: string,
  channelId: string,
  meta?: ButtonMetaData
) => {
  const server = await Main.client.guilds.fetch(guildId);
  const modifiableChannel = await server.channels.fetch(channelId);

  if (!modifiableChannel?.isTextBased()) {
    return false;
  }

  const guildOfServer = await Main.platform.guild.get(guildId);
  const payload = createInteractionPayload(
    guildOfServer,
    meta?.title,
    meta?.description,
    meta?.button,
    meta?.isJoinButton
  );

  const message = await modifiableChannel.send(payload);
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
        const embed = new EmbedBuilder()
          .setTitle(
            `You no longer have access to the \`${message}\` role in \`${guild.name}\`, because you have not fulfilled the requirements, disconnected your Discord account or just left it.`
          )
          .setColor(`#${config.embedColor.default}`);
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

  if (entryChannel.type === ChannelType.GuildVoice) {
    throw Error("Entry channel cannot be a voice channel.");
  }

  const editReason = `Updated by ${Main.client.user.username} because Guild Guard has been disabled.`;

  await entryChannel.permissionOverwrites.delete(
    guild.roles.everyone.id,
    editReason
  );

  await Promise.all(
    guild.roles.cache
      .filter((role) => !role.permissions.has("ViewChannel"))
      .map((role) =>
        role.edit({ permissions: role.permissions.add("ViewChannel") })
      )
  );

  await guild.roles.everyone.edit({
    permissions: guild.roles.everyone.permissions.add("ViewChannel"),
    reason: editReason,
  });
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

  const embed = new EmbedBuilder()
    .setTitle(`Poll #${id}: ${question}`)
    .setColor(`#${config.embedColor.default}`)
    .setDescription(await createPollText(poll));

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
    .filter(
      (channel) =>
        !!channel &&
        !channel.type
          .toString()
          .includes(ChannelType.GuildCategory.toString()) &&
        !channel.type.toString().includes(ChannelType.GuildVoice.toString())
    )
    .map((channel) => ({
      name: channel.name,
      id: channel.id,
    }));
};

const getVoiceChannelList = async (guildId: string): Promise<ChannelObj[]> => {
  const guild = await Main.client.guilds.fetch(guildId);
  const channels = await guild.channels.fetch();
  return channels
    .filter(
      (channel) =>
        channel?.type
          ?.toString()
          .includes(ChannelType.GuildStageVoice.toString()) ||
        channel?.type?.toString().includes(ChannelType.GuildVoice.toString())
    )
    .map((channel) => ({
      name: channel.name,
      id: channel.id,
    }));
};

const migrateUsers = async (guildId: string): Promise<any> => {
  logger.verbose(`migrateUsers ${guildId}`);

  const guild = await Main.client.guilds.fetch(guildId);

  const members = await guild.members.fetch();
  const filteredMembersByRoles = [...members].map(
    ([platformUserId, userDetails]) => ({
      platformUserId,
      discordRoles: [...userDetails.roles.cache].map(([r]) => r),
    })
  );
  await axios.post(`${config.backendUrl}/discord/migrateGuildUsers`, {
    platformGuildId: guildId,
    members: filteredMembersByRoles,
  });
  return true;
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
  sendDiscordButton,
  getUser,
  sendPollMessage,
  getEmoteList,
  getChannelList,
  getVoiceChannelList,
  resetGuildGuard,
  getUserPoap,
  migrateUsers,
};
