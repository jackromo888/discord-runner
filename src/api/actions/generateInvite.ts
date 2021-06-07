import { DiscordAPIError, Guild, Invite } from "discord.js";
import Main from "../../Main";
import { InviteResult } from "../types/results";

export default async function generateInvite(
  guildId: string
): Promise<InviteResult> {
  let guild: Guild;
  try {
    guild = await Main.Client.guilds.fetch(guildId);
  } catch (error) {
    if (error instanceof DiscordAPIError) {
      const errorMsg = "guild not found";
      return {
        code: null,
        error: errorMsg,
      };
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
    if (error instanceof DiscordAPIError) {
      const errorMsg = "cannot generate invite";
      return {
        code: null,
        error: errorMsg,
      };
    }
    throw error;
  }

  return {
    code: invite.code,
    error: null,
  };
}
