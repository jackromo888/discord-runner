import { Collection, GuildMember, Role } from "discord.js";
import Main from "../Main";
import logger from "../utils/logger";
import { ManageRolesParams } from "./types/params";
import { ActionError, InviteResult, UserResult } from "./types/results";
import { getUserResult } from "../utils/utils";

export async function manageRoles(
  params: ManageRolesParams,
  isUpgrade: boolean
): Promise<UserResult> {
  const guild = await Main.Client.guilds.fetch(params.guildId);

  const member = await guild.members.fetch(params.userId);

  const roleManager = await guild.roles.fetch();

  const rolesToManage: Collection<string, Role> = roleManager.cache.filter(
    (role) => params.roleIds.includes(role.id)
  );

  if (rolesToManage.size !== params.roleIds.length) {
    const missingRoleIds = params.roleIds.filter(
      (roleId) => !rolesToManage.map((role) => role.id).includes(roleId)
    );
    throw new ActionError("missing role(s)", missingRoleIds);
  }

  let updatedMember: GuildMember;
  if (isUpgrade) {
    updatedMember = await member.roles.add(rolesToManage);
  } else {
    updatedMember = await member.roles.remove(rolesToManage);
  }

  updatedMember.send(params.message).catch(logger.error);

  return getUserResult(updatedMember);
}

export async function generateInvite(guildId: string): Promise<InviteResult> {
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

export async function isMember(
  guildId: string,
  userId: string
): Promise<UserResult> {
  const guild = await Main.Client.guilds.fetch(guildId);

  const member = await guild.members.fetch(userId);

  return getUserResult(member);
}
