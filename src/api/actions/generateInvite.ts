import { Invite } from "discord.js";
import { Response } from "express";
import Main from "../../Main";
import logger from "../../utils/logger";

export default function generateInvite(guildId: string, res: Response): void {
  Main.Client.guilds
    .fetch(guildId)
    .then((guild) => {
      guild.systemChannel
        .createInvite({
          maxAge: 60 * 15,
          maxUses: 1,
          unique: true,
        })
        .then((invite: Invite) => {
          res.status(200).send(invite.code);
        })
        .catch((error) => {
          logger.error(error);
          const errorMsg = "cannot generate invite";
          res.status(400).json({
            error: errorMsg,
          });
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
