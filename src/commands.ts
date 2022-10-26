import { PlatformStatusResponse } from "@guildxyz/sdk";
import {
  Guild,
  EmbedBuilder,
  User,
  WebhookEditMessageOptions,
  ActionRowBuilder,
  MessageActionRowComponentBuilder,
  BaseMessageOptions,
} from "discord.js";
import config from "./config";
import { redisClient } from "./database";
import Main from "./Main";
import logger from "./utils/logger";
import { getJoinReplyMessage, getLinkButton } from "./utils/utils";

const ping = (createdTimestamp: number) =>
  `Latency is ${Date.now() - createdTimestamp}ms. API Latency is ${Math.round(
    Main.client.ws.ping
  )}ms`;

const status = async (
  serverId: string,
  user: User
): Promise<WebhookEditMessageOptions> => {
  // try to get status
  let statusResult: PlatformStatusResponse;
  try {
    statusResult = await Main.platform.user.status(user.id);
  } catch (error) {
    // if dc account not connected
    if (error?.message?.startsWith("Cannot find user")) {
      // try to get custom link
      let inviteLink: string;
      try {
        const joinResult = await Main.platform.user.join(serverId, user.id);
        inviteLink = joinResult.inviteLink;
      } catch {
        // ignored
      }
      const connectButton = getLinkButton(
        "Connect",
        inviteLink || config.guildUrl
      );
      const connectButtonRow =
        new ActionRowBuilder<MessageActionRowComponentBuilder>({
          components: [connectButton],
        });
      return {
        embeds: [
          new EmbedBuilder()
            .setDescription(
              "It seems you haven't connected this Discord account to Guild yet."
            )
            .setColor(`#${config.embedColor.error}`),
        ],
        components: [connectButtonRow],
      };
    }

    // log other errors
    logger.error(`status error: ${error.message}`);
    return {
      embeds: [
        new EmbedBuilder()
          .setDescription("An error occured while updating your status.")
          .setColor(`#${config.embedColor.error}`),
      ],
    };
  }

  if (statusResult?.length > 0) {
    const embed = new EmbedBuilder()
      .setColor(`#${config.embedColor.default}`)
      .setAuthor({
        name: `${user.username}'s Guilds`,
        iconURL: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
      })
      .setColor(`#${config.embedColor.default}`);

    statusResult.forEach((sr) => {
      embed.addFields({
        name: sr.guildName,
        value: sr.roles.map((r) => r.roleName).join(", ") || "-",
      });
    });

    return { embeds: [embed] };
  }

  const button = getLinkButton("Guild.xyz", config.guildUrl);
  const row = new ActionRowBuilder<MessageActionRowComponentBuilder>({
    components: [button],
  });

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("It seems you haven't joined any guilds yet.")
        .setColor(`#${config.embedColor.error}`)
        .setDescription("Find out more:"),
    ],
    components: [row],
  };
};

const join = async (
  userId: string,
  server: Guild,
  interactionToken: string
): Promise<BaseMessageOptions> => {
  const joinResult = await Main.platform.user.join(server.id, userId);
  logger.debug(
    `join-trace ${userId} ${server} api call result: ${JSON.stringify(
      joinResult
    )}`
  );
  const roleIds = joinResult?.roles?.map((r) => r.platformRoleId);

  const message = await getJoinReplyMessage(
    roleIds,
    server,
    userId,
    joinResult.inviteLink
  );

  if (!roleIds) {
    await redisClient.set(`joining:${server.id}:${userId}`, interactionToken, {
      EX: 15 * 60,
    });
  }
  return message;
};

export { ping, status, join };
