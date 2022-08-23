import { PlatformStatusResponse } from "@guildxyz/sdk";
import {
  Guild,
  MessageActionRow,
  MessageEmbed,
  MessageOptions,
  User,
  WebhookEditMessageOptions,
} from "discord.js";
import config from "./config";
import redisClient from "./database";
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
      const connectButtonRow = new MessageActionRow({
        components: [connectButton],
      });
      return {
        embeds: [
          new MessageEmbed({
            description:
              "It seems you haven't connected this Discord account to Guild yet.",
            color: `#${config.embedColor.error}`,
          }),
        ],
        components: [connectButtonRow],
      };
    }

    // log other errors
    logger.error(`status error: ${error.message}`);
    return {
      embeds: [
        new MessageEmbed({
          description: "An error occured while updating your status.",
          color: `#${config.embedColor.error}`,
        }),
      ],
    };
  }

  if (statusResult?.length > 0) {
    const embed = new MessageEmbed({
      author: {
        name: `${user.username}'s Guilds`,
        iconURL: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
      },
      color: `#${config.embedColor.default}`,
    });
    statusResult.forEach((sr) => {
      embed.addField(
        sr.guildName,
        sr.roles.map((r) => r.roleName).join(", ") || "-"
      );
    });

    return { embeds: [embed] };
  }

  const button = getLinkButton("Guild.xyz", config.guildUrl);
  const row = new MessageActionRow({ components: [button] });

  return {
    embeds: [
      new MessageEmbed({
        title: "It seems you haven't joined any guilds yet.",
        color: `#${config.embedColor.error}`,
        description: "Find out more:",
      }),
    ],
    components: [row],
  };
};

const join = async (
  userId: string,
  server: Guild,
  interactionToken: string
): Promise<MessageOptions> => {
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
  logger.debug(`join-trace ${userId} ${server} get reply message`);

  if (!roleIds) {
    redisClient.client.set(
      `joining:${server.id}:${userId}`,
      interactionToken,
      "EX",
      15 * 60
    );
  }
  logger.debug(`join-trace ${userId} ${server} set redis token`);

  return message;
};

export { ping, status, join };
