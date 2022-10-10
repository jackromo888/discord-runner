/* eslint-disable default-param-last */
import { GetGuildResponse } from "@guildxyz/sdk";
import { AxiosResponse } from "axios";
import {
  GuildMember,
  DiscordAPIError,
  MessageButton,
  MessageActionRow,
  MessageEmbed,
  Guild,
  Collection,
  GuildChannel,
  Permissions,
  MessageOptions,
  Role,
  PartialGuildMember,
  PermissionOverwrites,
} from "discord.js";
import { ActionError, ErrorResult, UserResult } from "../api/types";
import config from "../config";
import Main from "../Main";
import { sendMessageLimiter } from "./limiters";
import logger from "./logger";

const getUserResult = (member: GuildMember): UserResult => ({
  username: member.user.username,
  discriminator: member.user.discriminator,
  avatar: member.user.avatar,
  roles: member.roles.cache
    .filter((role) => role.id !== member.guild.roles.everyone.id)
    .map((role) => role.id),
});

const getErrorResult = (error: Error): ErrorResult => {
  let errorMsg: string;
  let ids: string[];
  if (error instanceof DiscordAPIError) {
    if (error.code === 50001) {
      // Missing access
      errorMsg = "missing access";
    } else if (error.code === 10013) {
      // Unknown User
      errorMsg = "cannot fetch member";
    } else if (error.code === 10007) {
      // Unknown Member
      errorMsg = "user is not member";
    } else {
      errorMsg = `discord api error: ${error.message}`;
    }
  } else if (error instanceof ActionError) {
    errorMsg = error.message;
    ids = error.ids;
  } else {
    logger.error(error);
    errorMsg = error.message;
  }
  return {
    errors: [
      {
        msg: errorMsg,
        value: ids,
      },
    ],
  };
};

const logBackendError = (error) => {
  const errorData = error.response?.data;
  const errors = errorData?.errors;

  if (errors?.length > 0 && errors[0]?.msg) {
    logger.verbose(errors[0].msg);
  } else if (error.response?.data) {
    logger.verbose(JSON.stringify(errorData));
  } else {
    logger.verbose(JSON.stringify(error));
  }
};

const getBackendErrorMessage = (error) => {
  const errorData = error.response?.data?.errors;

  if (errorData?.length > 0 && errorData[0]?.msg) {
    return errorData[0].msg;
  }
  return null;
};

const logAxiosResponse = (res: AxiosResponse<any>) => {
  const data = JSON.stringify(res.data);
  logger.verbose(
    `${res.status} ${res.statusText} data:${
      data.length > 2000 ? " hidden" : data
    }`
  );
  return res;
};

const isNumber = (value: any) =>
  typeof value === "number" && Number.isFinite(value);

const getMissingPermissions = (bot: GuildMember) => [
  {
    name: "View Channel",
    value: bot.permissions.has(Permissions.FLAGS.VIEW_CHANNEL),
  },
  {
    name: "Manage Channels",
    value: bot.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS),
  },
  {
    name: "Manage Roles",
    value: bot.permissions.has(Permissions.FLAGS.MANAGE_ROLES),
  },
  {
    name: "Create Instant Invite",
    value: bot.permissions.has(Permissions.FLAGS.CREATE_INSTANT_INVITE),
  },
  {
    name: "Send Messages",
    value: bot.permissions.has(Permissions.FLAGS.SEND_MESSAGES),
  },
  {
    name: "Embed Links",
    value: bot.permissions.has(Permissions.FLAGS.EMBED_LINKS),
  },
  {
    name: "Add Reactions",
    value: bot.permissions.has(Permissions.FLAGS.ADD_REACTIONS),
  },
  {
    name: "Use External Emojis",
    value: bot.permissions.has(Permissions.FLAGS.USE_EXTERNAL_EMOJIS),
  },
  {
    name: "Read Message History",
    value: bot.permissions.has(Permissions.FLAGS.READ_MESSAGE_HISTORY),
  },
];

const hasNecessaryPermissions = async (guildId: string): Promise<boolean> => {
  const guild = await Main.client.guilds.fetch(guildId);
  const bot = guild.me;
  const botPermissions = getMissingPermissions(bot);
  if (botPermissions.some((bp) => !bp.value)) {
    const errorMessage = botPermissions
      .filter((p) => !p.value)
      .map((p) => p.name)
      .join(", ");
    logger.error(
      `missing permissions ${guild.name} ${guildId} ${errorMessage}`
    );
    throw new Error(
      `Missing permissions! You should grant the following permission(s) for our bot to work properly: ${errorMessage}`
    );
  }
  return true;
};

const createInteractionPayload = (
  guild: GetGuildResponse,
  title?: string,
  messageText: string = null,
  buttonText?: string,
  isJoinButton: boolean = true
) => {
  const lastPoap = guild?.poaps?.pop();
  const slicedButtonText = buttonText?.slice(0, 80);
  const buttonData = isJoinButton
    ? {
        customId: "join-button",
        label: slicedButtonText || `Join ${guild?.name || "Guild"}`,
        title: title || "Verify your wallet",
        description:
          messageText ||
          guild?.description ||
          "Join this guild and get your role(s)!",
        guideUrl: "https://docs.guild.xyz/",
        thumbnailUrl:
          "https://cdn.discordapp.com/attachments/950682012866465833/951448318976884826/dc-message.png",
      }
    : {
        customId: "poap-claim-button",
        label: slicedButtonText || `Claim POAP`,
        title: title || lastPoap?.fancyId || "Claim your POAP",
        description:
          messageText || "Claim this magnificent POAP to your collection!",
        guideUrl: "https://docs.guild.xyz/guild/guides/poap-distribution",
        thumbnailUrl:
          "https://cdn.discordapp.com/attachments/981112277317087293/981897601995657226/poap.png",
      };

  logger.verbose(`${JSON.stringify(buttonData)}`);

  const buttonBase = new MessageButton({
    customId: buttonData.customId,
    label: buttonData.label,
    emoji: "🔗",
    style: "PRIMARY",
  });
  const guildPage = new MessageButton({
    label: "Can't join",
    url: `https://guild.xyz/${guild.urlName}`,
    style: "LINK",
  });
  const guideButton = new MessageButton({
    label: "Guide",
    url: buttonData.guideUrl,
    style: "LINK",
  });
  const row = new MessageActionRow({
    components: isJoinButton
      ? [buttonBase, guildPage, guideButton]
      : [buttonBase, guideButton],
  });

  return {
    embeds: [
      new MessageEmbed({
        title: buttonData.title,
        url: guild ? `${config.guildUrl}/${guild?.urlName}` : null,
        description:
          messageText ||
          guild?.description ||
          "Join this guild and get your role(s)!",
        color: `#${config.embedColor.default}`,
        author: {
          name: guild?.name || "Guild",
          iconURL: encodeURI(
            guild?.imageUrl?.startsWith("https")
              ? guild?.imageUrl
              : "https://cdn.discordapp.com/attachments/950682012866465833/951448319169802250/kerek.png"
          ),
        },
        thumbnail: {
          url: buttonData.thumbnailUrl,
        },
        footer: {
          text: "Do not share your private keys. We will never ask for your seed phrase.",
        },
      }),
    ],
    components: [row],
  };
};

const getAccessedChannelsByRoles = (guild: Guild, accessedRoles: string[]) =>
  guild.channels.cache.filter(
    (channel) =>
      channel.type !== "GUILD_CATEGORY" &&
      !channel.isThread() &&
      channel.permissionOverwrites.cache.some(
        (po) =>
          accessedRoles.some((ar) => ar === po.id) &&
          po.allow.has(Permissions.FLAGS.VIEW_CHANNEL)
      )
  ) as Collection<string, GuildChannel>;

const denyViewEntryChannelForRole = async (
  role: Role,
  entryChannelId: string
) => {
  try {
    const entryChannel = role.guild.channels.cache.get(
      entryChannelId
    ) as GuildChannel;
    if (
      !!entryChannel &&
      !entryChannel.permissionOverwrites.cache
        .get(role.id)
        ?.deny.has(Permissions.FLAGS.VIEW_CHANNEL)
    ) {
      await entryChannel.permissionOverwrites.create(role.id, {
        VIEW_CHANNEL: false,
      });
    }
  } catch (error) {
    logger.warn(error);
    throw new Error(
      `Entry channel does not exists. (server: ${role.guild.id}, channel: ${entryChannelId})`
    );
  }
};

const getChannelsByCategoryWithRoles = (guild: Guild) => {
  // sort channels by categoryId
  const channelsByCategoryId = guild.channels.cache.reduce<
    Map<string, { id: string; name: string; roles: string[] }[]>
  >((acc, ch) => {
    // skip if not text or news channel
    if (ch.type !== "GUILD_TEXT" && ch.type !== "GUILD_NEWS") {
      return acc;
    }

    // handle where threre is not parent
    const parentId = ch.parent?.id || "-";

    // create parentId key if not exists
    if (!acc.has(parentId)) {
      acc.set(parentId, []);
    }

    // filter for roles that have explicit permission overwrites
    const roles = guild.roles.cache
      .filter((role) =>
        ch.permissionOverwrites.cache
          .get(role.id)
          ?.allow.has(Permissions.FLAGS.VIEW_CHANNEL)
      )
      .map((role) => role.id);

    // add channel info to the category's array
    acc.get(parentId).push({
      id: ch.id,
      name: ch.name,
      roles,
    });
    return acc;
  }, new Map());

  // add categoryName and convert to array
  const channelsByCategory = [];
  channelsByCategoryId.forEach((v, k) => {
    channelsByCategory.push({
      id: k,
      name: k === "-" ? "-" : guild.channels.cache.get(k).name,
      channels: v,
    });
  });

  return channelsByCategory;
};

const getCategoriesWithChannels = (guild: Guild, roleIds: string[]) => {
  const categories: { [key: string]: GuildChannel[] } = {};
  const accessedChannelsByRoles = getAccessedChannelsByRoles(guild, roleIds);

  accessedChannelsByRoles.forEach((channel) => {
    if (categories[channel.parentId]) {
      categories[channel.parentId].push(channel);
    } else {
      categories[channel.parentId] = [channel];
    }
  });

  return categories;
};

const getCategoryNameById = (guild: Guild, categoryId: string) => {
  const channelsByCategoryWithRoles = getChannelsByCategoryWithRoles(guild);
  const category = channelsByCategoryWithRoles.find((c) => c.id === categoryId);
  return category?.name || "";
};

const getCategoryFieldValues = (guild: Guild, roleIds: string[]) => {
  const fields = [];

  const categoryEmoji =
    Main.client.emojis.cache.get("893836008712441858") || "▶️";
  const privateChannelEmoji =
    Main.client.emojis.cache.get("893836025699377192") || "#";

  const categories = getCategoriesWithChannels(guild, roleIds);

  Object.keys(categories).forEach((categoryId) => {
    const categoryName = getCategoryNameById(guild, categoryId);
    fields.push({
      name:
        categoryName !== ""
          ? `${categoryEmoji} ${categoryName}`
          : "Without category",
      value: `\n${categories[categoryId]
        .map(
          (c) =>
            `[${privateChannelEmoji}${c?.name}](https://discord.com/channels/${guild.id}/${c.id})`
        )
        .join("\n")}`.substring(0, 1024),
    });
  });

  return fields;
};

const getRoleNames = (guild: Guild, roleIds: string[]) =>
  guild.roles.cache
    .filter((role) => roleIds.some((roleId) => roleId === role.id))
    .map((role) => role?.name);

const getNotAccessedRoleIds = (discordRoleIds: string[], roleIds: string[]) =>
  discordRoleIds.filter((roleId) => !roleIds.includes(roleId));

const getDiscordRoleIds = (
  guildOfServer: GetGuildResponse,
  serverId: string
): string[] => {
  const guildPlatformId = guildOfServer.guildPlatforms.find(
    (gp) => gp.platformGuildId === serverId
  )?.id;

  return guildOfServer.roles
    .flatMap((r) =>
      r.rolePlatforms
        ? r.rolePlatforms.filter((rp) => rp.guildPlatformId === guildPlatformId)
        : []
    )
    .map((rp) => rp.platformRoleId);
};

const printRoleNames = (
  roleNames: string[],
  accessed: boolean,
  modifiedRoleName: string = ""
) => {
  if (roleNames.length === 0) return "";
  const emoji = accessed ? `✅` : `❌`;
  let result: string = "";
  let filteredRoleNames = roleNames;

  if (modifiedRoleName !== "") {
    result = `${
      accessed ? `✅ 🆕 ${modifiedRoleName}\n` : `❌ 🆕 ${modifiedRoleName}\n`
    }`;
    filteredRoleNames = roleNames.filter((rn) => rn !== modifiedRoleName);
  }

  if (filteredRoleNames.length > 0) {
    result += `${emoji} ${filteredRoleNames.join(`\n${emoji} `)}`;
  }

  return result;
};

const getLinkButton = (label: string, url: string) =>
  new MessageButton({
    label,
    style: "LINK",
    url,
    disabled: false,
    type: 2,
  });

const getJoinReplyMessage = async (
  roleIds: string[],
  server: Guild,
  userId: string,
  inviteLink: string
): Promise<MessageOptions> => {
  let message: MessageOptions;
  logger.verbose(`getJoinReply - ${roleIds} ${server.id} ${userId}`);

  const guildOfServer = await Main.platform.guild.get(server.id);
  const discordRoleIds = getDiscordRoleIds(guildOfServer, server.id);

  logger.verbose(
    `getJoinReplyMessage - guildOfServer ${guildOfServer?.name} ${guildOfServer?.urlName}`
  );

  // if not connected to guild
  if (!roleIds && inviteLink) {
    const button = getLinkButton("Join", inviteLink);

    return {
      components: [new MessageActionRow({ components: [button] })],
      content: `This is **your** join link. Do **NOT** share it with anyone!`,
    };
  }

  // show accessed / no accessed roles if joined
  if (roleIds && roleIds.length !== 0) {
    const accessedRoleNames = getRoleNames(server, roleIds);
    const notAccessedRoleIds = getNotAccessedRoleIds(discordRoleIds, roleIds);
    const notAccessedRoleNames = getRoleNames(server, notAccessedRoleIds);

    const fields = getCategoryFieldValues(server, roleIds);

    logger.verbose(`getJoinReplyMessage - ${fields}`);

    const description = `You got ${roleIds.length} out of ${
      discordRoleIds.length
    } role${
      discordRoleIds.length > 1 ? "s" : ""
    } with your connected address(es):\n\n${printRoleNames(
      accessedRoleNames,
      true
    )}\n${printRoleNames(notAccessedRoleNames, false)}\n${
      notAccessedRoleNames.length > 0 ? "\n" : ""
    }${
      fields.length > 0
        ? "...giving you access to the following channels:\n"
        : ""
    }`;

    const embed = new MessageEmbed({
      title: `Successfully joined guild`,
      description,
      color: 0x0dff00,
      fields,
    });

    const guild = await Main.platform.guild.get(server.id);
    const button = getLinkButton(
      "View details",
      `${config.guildUrl}/${guild.urlName}`
    );

    message = {
      content: "We have updated your accesses.",
      components: [new MessageActionRow({ components: [button] })],
      embeds: [embed],
    };
  } else if (roleIds && roleIds.length === 0) {
    // no access
    const notAccessedRoleIds = getNotAccessedRoleIds(discordRoleIds, roleIds);
    const notAccessedRoleNames = getRoleNames(server, notAccessedRoleIds);

    const guild = await Main.platform.guild.get(server.id);
    const button = getLinkButton(
      "View details",
      `${config.guildUrl}/${guild.urlName}`
    );

    const embed = new MessageEmbed({
      title: `No access`,
      description: `You don't satisfy the requirements to any roles on this server with your connected address(es).\n\n${printRoleNames(
        notAccessedRoleNames,
        false
      )}`,
      color: `#${config.embedColor.error}`,
    });

    message = {
      content: "We have updated your accesses successfully.",
      components: [new MessageActionRow({ components: [button] })],
      embeds: [embed],
    };
  }

  return message;
};

const updateAccessedChannelsOfRole = (
  server: Guild,
  roleId: string,
  channelIds: string[],
  isGuarded: boolean,
  entryChannelId: string
) => {
  logger.verbose(
    `updateAccessedChannelsOfRole - ${server.id} ${roleId} ${channelIds} ${entryChannelId}`
  );
  const shouldHaveAccess = new Set(channelIds);

  const channels = server.channels.cache.filter(
    (channel) => !channel.isThread()
  ) as Collection<string, GuildChannel>;

  if (isGuarded) {
    shouldHaveAccess.delete(entryChannelId);
    channels.delete(entryChannelId);
  }
  const [channelsToAllow, channelsToDeny] = channels.partition(
    (channel) =>
      shouldHaveAccess.has(channel.id) ||
      shouldHaveAccess.has(channel.parentId) ||
      (channel.type !== "GUILD_CATEGORY" &&
        !channel.parent &&
        shouldHaveAccess.has("-"))
  );

  return Promise.all([
    ...channelsToDeny.map((channelToDenyAccessTo) =>
      channelToDenyAccessTo.permissionOverwrites.edit(roleId, {
        VIEW_CHANNEL: null,
      })
    ),
    ...channelsToAllow.map((channelToAllowAccessTo) =>
      channelToAllowAccessTo.permissionOverwrites.edit(roleId, {
        VIEW_CHANNEL: true,
      })
    ),
    ...channelsToAllow.map((channelToAllowAccessTo) =>
      channelToAllowAccessTo.permissionOverwrites.edit(
        server.roles.everyone.id,
        {
          VIEW_CHANNEL: false,
        }
      )
    ),
  ]);
};

const notifyAccessedChannels = async (
  member: GuildMember | PartialGuildMember,
  roleId: string,
  guildName: string,
  roleName: string
) => {
  const accessedChannels = getAccessedChannelsByRoles(member.guild, [roleId]);

  const sortedChannels = accessedChannels.reduce<
    Map<string | null, GuildChannel[]>
  >((acc, value) => {
    let channels = acc.get(value?.parent?.name);
    if (!channels) {
      channels = [];
    }
    channels.push(value);
    acc.set(value?.parent?.name, channels);
    return acc;
  }, new Map());

  let message: string;
  if (accessedChannels.size === 0) {
    message = `You got access to the \`${roleName}\` role  in \`${member.guild.name}\`.`;
  } else {
    message = `You got access to ${
      accessedChannels.size > 1 ? "these channels" : "this channel"
    } with the \`${guildName}\` role in \`${member.guild.name}\`:`;
  }

  const embed = new MessageEmbed({
    title: message,
    color: `#${config.embedColor.default}`,
  });

  const categoryEmoji = Main.client.emojis.cache.get("893836008712441858");
  const privateChannelEmoji =
    Main.client.emojis.cache.get("893836025699377192");

  sortedChannels.forEach((channel, key) => {
    const fieldValue = channel
      .map(
        (c) =>
          `[${privateChannelEmoji || ""}${
            c.name
          }](https://discord.com/channels/${member.guild.id}/${c.id})`
      )
      .join("\n");
    embed.addField(
      `${categoryEmoji || ""}${key || "Without Category"}`,
      fieldValue.length < 1025 ? fieldValue : fieldValue.substring(0, 1024)
    );
  });

  await sendMessageLimiter.schedule(() =>
    member.send({ embeds: [embed] }).catch()
  );
};

const checkInviteChannel = (server: Guild, inviteChannelId: string) => {
  // check if invite channel exists
  let channelId: string;

  if (
    inviteChannelId &&
    server.channels.cache
      .filter((c) => c.type === "GUILD_TEXT" || c.type === "GUILD_NEWS")
      .find((c) => c.id === inviteChannelId)
  ) {
    channelId = inviteChannelId;
  } else {
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
      logger.verbose(`Cannot find public channel in ${server.id}`);
      channelId = server.channels.cache.find((c) => c.isText())?.id;
    }

    logger.warn(
      `Invite channel ${inviteChannelId} in server ${server.id} was replaced by ${channelId}`
    );
  }

  return channelId;
};

export {
  getUserResult,
  getErrorResult,
  logBackendError,
  getBackendErrorMessage,
  logAxiosResponse,
  isNumber,
  createInteractionPayload,
  getJoinReplyMessage,
  getAccessedChannelsByRoles,
  denyViewEntryChannelForRole,
  getChannelsByCategoryWithRoles,
  updateAccessedChannelsOfRole,
  notifyAccessedChannels,
  checkInviteChannel,
  getCategoriesWithChannels,
  getCategoryNameById,
  getCategoryFieldValues,
  getRoleNames,
  getNotAccessedRoleIds,
  getDiscordRoleIds,
  printRoleNames,
  getLinkButton,
  hasNecessaryPermissions,
};
