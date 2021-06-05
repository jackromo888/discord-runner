import { DiscordAPIError } from "discord.js";
import { Response } from "express";
import Main from "../../Main";
import logger from "../../utils/logger";
import getUserResult from "../utils/getUserResult";

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
          res.status(200).json(getUserResult(member));
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
