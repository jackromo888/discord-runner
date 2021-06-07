import {
  Collection,
  DiscordAPIError,
  Guild,
  GuildMember,
  Role,
  RoleManager,
} from "discord.js";
import Main from "../../Main";
import logger from "../../utils/logger";
import { ManageRolesParams } from "../types/params";
import { ActionError, UserResult } from "../types/results";
import getUserResult from "../../utils/utils";

export default async function manageRoles(
  params: ManageRolesParams,
  isUpgrade: boolean
): Promise<UserResult | ActionError> {
  let guild: Guild;
  try {
    guild = await Main.Client.guilds.fetch(params.guildId);
  } catch (error) {
    logger.error(error);
    if (error instanceof DiscordAPIError) {
      return new ActionError("guild not found");
    }
    throw error;
  }

  let member: GuildMember;
  try {
    member = await guild.members.fetch(params.userId);
  } catch (error) {
    logger.error(error);
    if (error instanceof DiscordAPIError) {
      return new ActionError("cannot fetch member");
    }
    throw error;
  }

  let roleManager: RoleManager;
  try {
    roleManager = await guild.roles.fetch();
  } catch (error) {
    logger.error(error);
    if (error instanceof DiscordAPIError) {
      return new ActionError("cannot fetch roles");
    }
    throw error;
  }

  const rolesToAddOrRemove: Collection<string, Role> = roleManager.cache.filter(
    (role) => params.roleIds.includes(role.id)
  );
  if (rolesToAddOrRemove.size !== params.roleIds.length) {
    const missingRoleIds = params.roleIds.filter(
      (roleId) => !rolesToAddOrRemove.map((role) => role.id).includes(roleId)
    );
    return new ActionError(`missing role(s): ${missingRoleIds}`);
  }

  let updatedMember: GuildMember;
  if (isUpgrade) {
    try {
      updatedMember = await member.roles.add(rolesToAddOrRemove);
    } catch (error) {
      logger.error(error);
      return new ActionError("cannot add role(s) to user");
    }
  } else {
    try {
      updatedMember = await member.roles.remove(rolesToAddOrRemove);
    } catch (error) {
      logger.error(error);
      return new ActionError("cannot remove role(s) from user");
    }
  }

  updatedMember.send(params.message).catch(logger.error);

  return getUserResult(updatedMember);
}
