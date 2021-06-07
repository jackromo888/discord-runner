import { DiscordAPIError, Guild, Invite } from "discord.js";
import Main from "../../Main";
import logger from "../../utils/logger";
import { ActionError, InviteResult } from "../types/results";

export default async function generateInvite(
  guildId: string
): Promise<InviteResult | ActionError> {
  let guild: Guild;
  try {
    guild = await Main.Client.guilds.fetch(guildId);
  } catch (error) {
    logger.error(error);
    if (error instanceof DiscordAPIError) {
      return new ActionError("guild not found");
    }
    throw error;
  }

  let invite: Invite;
  try {
    invite = await guild.systemChannel.createInvite({
      maxAge: 60 * 15,
      maxUses: 1,
      unique: true,
    });
  } catch (error) {
    logger.error(error);
    if (error instanceof DiscordAPIError) {
      return new ActionError("cannot generate invite");
    }
    throw error;
  }

  return {
    code: invite.code,
  };
}
