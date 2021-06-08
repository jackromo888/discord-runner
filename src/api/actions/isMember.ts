import Main from "../../Main";
import { UserResult } from "../types/results";
import { getUserResult } from "../../utils/utils";

export default async function isMember(
  guildId: string,
  userId: string
): Promise<UserResult> {
  const guild = await Main.Client.guilds.fetch(guildId);

  const member = await guild.members.fetch(userId);

  return getUserResult(member);
}
