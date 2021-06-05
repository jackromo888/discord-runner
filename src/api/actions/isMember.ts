import { DiscordAPIError } from "discord.js";
import { Response } from "express";
import Main from "../../Main";
import logger from "../../utils/logger";

export default function isMember(
  guildId: string,
  userId: string,
  res: Response
): void {
  Main.Client.guilds
    .fetch(guildId)
    .then((guild) => {
      guild.members
        .fetch(userId)
        .then((member) => {
          res.status(200).json({
            username: member.user.username,
            discriminator: member.user.discriminator,
            avatar: member.user.avatar,
            roles: member.roles.cache
              .filter((role) => role.id !== guild.roles.everyone.id)
              .map((role) => role.id),
          });
        })
        .catch((error: DiscordAPIError) => {
          if (error.message === "Unknown Member") {
            res.status(200).send(null);
          } else {
            logger.error(error);
            const errorMsg = "cannot fetch member";
            res.status(400).json({
              error: errorMsg,
            });
          }
        });
    })
    .catch((error) => {
      logger.error(error);
      const errorMsg = "guild not found";
      res.status(400).json({
        error: errorMsg,
      });
    });
}
