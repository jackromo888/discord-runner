import { GuildMember } from "discord.js";
import { UserResult } from "../types/results";

export default function getUserResult(member: GuildMember): UserResult {
  return {
    username: member.user.username,
    discriminator: member.user.discriminator,
    avatar: member.user.avatar,
    roles: member.roles.cache
      .filter((role) => role.id !== member.guild.roles.everyone.id)
      .map((role) => role.id),
  };
}
