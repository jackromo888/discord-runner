import { Guild, MessageEmbed, MessageOptions, User } from "discord.js";
import config from "./config";
import redisClient from "./database";
import Main from "./Main";
import { userJoined } from "./discordSpecific/communicationService";
import logger from "./utils/logger";
import { getJoinReplyMessage } from "./utils/utils";

const ping = (createdTimestamp: number) =>
  `Latency is ${Date.now() - createdTimestamp}ms. API Latency is ${Math.round(
    Main.client.ws.ping
  )}ms`;

const status = async (serverId: string, user: User) => {
  const statusResult = await Main.platform.user.status(serverId, user.id);

  if (statusResult?.length > 0) {
    // for logging purposes
    let currentGuildId = null;
    await Promise.all(
      statusResult.map(async (sr) => {
        try {
          const guild = await Main.client.guilds.fetch(sr.platformGuildId);
          currentGuildId = guild.id;
          const member = await guild.members.fetch(user.id);

          const discordRoleIds = sr.roles.map((r) => r.platformRoleId);

          const roleManager = await guild.roles.fetch();
          const roleToAdd = roleManager.filter((r) =>
            discordRoleIds.includes(r.id)
          );

          if (roleToAdd) {
            logger.verbose(
              `status: add roles ${roleToAdd.map((r) => r.id)} to ${
                user.id
              } in ${guild.id}`
            );
            await member.roles.add(roleToAdd);
          }
        } catch (error) {
          logger.verbose(
            `Cannot add role to member. Missing permissions? GuildID: ${currentGuildId} ${error.message}`
          );
        }
      })
    );

    const embed = new MessageEmbed({
      author: {
        name: `${user.username}'s Guilds`,
        iconURL: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
      },
      color: `#${config.embedColor}`,
    });
    statusResult.forEach((sr) => {
      embed.addField(sr.guildName, sr.roles.map((r) => r.name).join(", "));
    });

    return embed;
  }

  return new MessageEmbed({
    title: "It seems you haven't joined any guilds yet.",
    color: `#${config.embedColor}`,
    description:
      "You can find more information on [agora.xyz](https://agora.xyz) or on [guild.xyz](https://guild.xyz).",
  });
};

const join = async (
  userId: string,
  guild: Guild,
  interactionToken: string
): Promise<MessageOptions> => {
  const roleIds = await userJoined(userId, guild.id);

  const message = await getJoinReplyMessage(roleIds, guild, userId);

  if (!roleIds) {
    redisClient.client.set(
      `joining:${guild.id}:${userId}`,
      interactionToken,
      "EX",
      15 * 60
    );
  }

  return message;
};

export { ping, status, join };
