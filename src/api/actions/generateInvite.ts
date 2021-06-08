import Main from "../../Main";
import { InviteResult } from "../types/results";

export default async function generateInvite(
  guildId: string
): Promise<InviteResult> {
  const guild = await Main.Client.guilds.fetch(guildId);

  const invite = await guild.systemChannel.createInvite({
    maxAge: 60 * 15,
    maxUses: 1,
    unique: true,
  });

  return {
    code: invite.code,
  };
}
