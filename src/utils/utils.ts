/* eslint-disable default-param-last */
import { GetGuildResponse } from "@guildxyz/sdk";
import { AxiosResponse } from "axios";
import {
  GuildMember,
  DiscordAPIError,
  Guild,
  Collection,
  GuildChannel,
  Role,
  PartialGuildMember,
  PermissionOverwrites,
  ActionRowBuilder,
  MessageActionRowComponentBuilder,
  ButtonStyle,
  ButtonBuilder,
  ChannelType,
  EmbedBuilder,
  BaseMessageOptions,
} from "discord.js";
import nacl from "tweetnacl";
import { ActionError, ErrorResult, UserResult } from "../api/types";
import config from "../config";
import Main from "../Main";
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
    name: "VIEW_CHANNEL",
    value: bot.permissions.has("ViewChannel"),
  },
  {
    name: "MANAGE_CHANNELS",
    value: bot.permissions.has("ManageChannels"),
  },
  {
    name: "MANAGE_ROLES",
    value: bot.permissions.has("ManageRoles"),
  },
  {
    name: "CREATE_INSTANT_INVITE",
    value: bot.permissions.has("CreateInstantInvite"),
  },
  {
    name: "SEND_MESSAGES",
    value: bot.permissions.has("SendMessages"),
  },
  {
    name: "EMBED_LINKS",
    value: bot.permissions.has("EmbedLinks"),
  },
  {
    name: "ADD_REACTIONS",
    value: bot.permissions.has("AddReactions"),
  },
  {
    name: "USE_EXTERNAL_EMOJIS",
    value: bot.permissions.has("UseExternalEmojis"),
  },
  {
    name: "Read Message History",
    value: bot.permissions.has("ReadMessageHistory"),
  },
];

const hasNecessaryPermissions = async (guildId: string): Promise<boolean> => {
  const guild = await Main.client.guilds.fetch(guildId);
  const bot = guild.members.me;
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

  const buttonBase = new ButtonBuilder()
    .setCustomId(buttonData.customId)
    .setLabel(buttonData.label)
    .setEmoji("🔗")
    .setStyle(ButtonStyle.Primary);

  const guildPage = new ButtonBuilder()
    .setLabel("Can't join")
    .setURL(`https://guild.xyz/${guild.urlName}`)
    .setStyle(ButtonStyle.Link);

  const guideButton = new ButtonBuilder()
    .setLabel("Guide")
    .setURL(buttonData.guideUrl)
    .setStyle(ButtonStyle.Link);

  const row =
    new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
      isJoinButton
        ? [buttonBase, guildPage, guideButton]
        : [buttonBase, guideButton]
    );

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(buttonData.title)
        .setURL(guild ? `${config.guildUrl}/${guild?.urlName}` : null)
        .setDescription(
          messageText ||
            guild?.description ||
            "Join this guild and get your role(s)!"
        )
        .setColor(`#${config.embedColor.default}`)
        .setAuthor({
          name: guild?.name || "Guild",
          iconURL: encodeURI(
            guild?.imageUrl?.startsWith("https")
              ? guild?.imageUrl
              : "https://cdn.discordapp.com/attachments/950682012866465833/951448319169802250/kerek.png"
          ),
        })
        .setThumbnail(buttonData.thumbnailUrl)
        .setFooter({
          text: "Do not share your private keys. We will never ask for your seed phrase.",
        }),
    ],
    components: [row],
  };
};

const getAccessedChannelsByRoles = (guild: Guild, accessedRoles: string[]) =>
  guild.channels.cache.filter(
    (channel) =>
      channel.type !== ChannelType.GuildCategory &&
      !channel.isThread() &&
      channel.permissionOverwrites.cache.some(
        (po) =>
          accessedRoles.some((ar) => ar === po.id) &&
          po.allow.has("ViewChannel")
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
        ?.deny.has("ViewChannel")
    ) {
      await entryChannel.permissionOverwrites.create(role.id, {
        ViewChannel: false,
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
    if (
      ch.type !== ChannelType.GuildText &&
      ch.type !== ChannelType.GuildAnnouncement
    ) {
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
        ch.permissionOverwrites.cache.get(role.id)?.allow.has("ViewChannel")
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
  new ButtonBuilder()
    .setLabel(label)
    .setStyle(ButtonStyle.Link)
    .setURL(url)
    .setDisabled(false);

const getJoinReplyMessage = async (
  roleIds: string[],
  server: Guild,
  userId: string,
  inviteLink: string
): Promise<BaseMessageOptions> => {
  let message: BaseMessageOptions;
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
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents([
          button,
        ]),
      ],
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

    const embed = new EmbedBuilder()
      .setColor("#0dff00")
      .setTitle("Successfully joined guild")
      .setDescription(description)
      .addFields(fields);

    const guild = await Main.platform.guild.get(server.id);
    const button = getLinkButton(
      "View details",
      `${config.guildUrl}/${guild.urlName}`
    );

    message = {
      content: "We have updated your accesses.",
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents([
          button,
        ]),
      ],
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

    const embed = new EmbedBuilder()
      .setTitle("No access")
      .setDescription(
        `You don't satisfy the requirements to any roles on this server with your connected address(es).\n\n${printRoleNames(
          notAccessedRoleNames,
          false
        )}`
      )
      .setColor(`#${config.embedColor.error}`);

    message = {
      content: "We have updated your accesses successfully.",
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents([
          button,
        ]),
      ],
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

  if (channelIds?.length > 0) {
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
        (channel.type !== ChannelType.GuildCategory &&
          !channel.parent &&
          shouldHaveAccess.has("-"))
    );

    return Promise.all([
      ...channelsToDeny.map((channelToDenyAccessTo) =>
        channelToDenyAccessTo.permissionOverwrites.edit(roleId, {
          ViewChannel: null,
        })
      ),
      ...channelsToAllow.map((channelToAllowAccessTo) =>
        channelToAllowAccessTo.permissionOverwrites.edit(roleId, {
          ViewChannel: true,
        })
      ),
      ...channelsToAllow.map((channelToAllowAccessTo) =>
        channelToAllowAccessTo.permissionOverwrites.edit(
          server.roles.everyone.id,
          {
            ViewChannel: false,
          }
        )
      ),
    ]);
  }
  return [];
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

  const embed = new EmbedBuilder()
    .setTitle(message)
    .setColor(`#${config.embedColor.default}`);

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
    embed.addFields({
      name: `${categoryEmoji || ""}${key || "Uncategorized"}`,
      value:
        fieldValue.length < 1025 ? fieldValue : fieldValue.substring(0, 1024),
    });
  });

  try {
    await member.send({ embeds: [embed] });
  } catch (error) {
    logger.error(
      `notifyAccessedChannels error sending message - ${error.message}`
    );
  }
};

const checkInviteChannel = async (server: Guild, inviteChannelId: string) => {
  // check if invite channel exists
  let channelId: string;

  if (
    inviteChannelId &&
    server.channels.cache
      .filter(
        (c) =>
          c.type === ChannelType.GuildText ||
          c.type === ChannelType.GuildAnnouncement
      )
      .find((c) => c.id === inviteChannelId)
  ) {
    channelId = inviteChannelId;
  } else {
    // find the first channel which is visible to everyone
    const publicChannel = server.channels.cache.find(
      (c) =>
        c.isTextBased() &&
        !(c as any).permissionOverwrites?.cache.some(
          (po: PermissionOverwrites) =>
            po.id === server.roles.everyone.id && po.deny.any("ViewChannel")
        )
    );

    if (publicChannel) {
      channelId = publicChannel.id;
    } else {
      // if there are no visible channels, throwing an error
      logger.verbose(`Cannot find public channel in ${server.id}`);
      throw new Error(
        `Cannot find public channel in the ${server.name} discord server. Guild.xyz bot needs at least one channel for creating invites. `
      );
    }

    logger.warn(
      `Invite channel ${inviteChannelId} in server ${server.id} was replaced by ${channelId}`
    );
  }

  return channelId;
};

const signNacl = (token: string) => {
  const u8Secret = new Uint8Array(Buffer.from(config.naclSecret, "base64url"));
  const u8Token = new Uint8Array(Buffer.from(token, "utf8"));
  const signedU8Token = nacl.sign(u8Token, u8Secret);
  const signedBase64Token = Buffer.from(signedU8Token).toString("base64url");

  return signedBase64Token;
};

const readNacl = (signedBase64Token: string) => {
  const u8Public = new Uint8Array(Buffer.from(config.naclPublic, "base64url"));
  const signedU8Token = new Uint8Array(
    Buffer.from(signedBase64Token, "base64url")
  );
  const opened = nacl.sign.open(signedU8Token, u8Public);
  const token = Buffer.from(opened).toString("utf8");

  return token;
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
  signNacl,
  readNacl,
  hasNecessaryPermissions,
};
