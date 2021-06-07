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
import getUserResult from "../utils/getUserResult";

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
      const errorMsg = "guild not found";
      return {
        error: errorMsg,
      };
    }
    throw error;
  }

  let member: GuildMember;
  try {
    member = await guild.members.fetch(params.userId);
  } catch (error) {
    logger.error(error);
    if (error instanceof DiscordAPIError) {
      return {
        error: "cannot fetch member",
      };
    }
    throw error;
  }

  let roleManager: RoleManager;
  try {
    roleManager = await guild.roles.fetch();
  } catch (error) {
    logger.error(error);
    if (error instanceof DiscordAPIError) {
      return {
        error: "cannot fetch roles",
      };
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
    return {
      error: `missing role(s): ${missingRoleIds}`,
    };
  }

  let updatedMember: GuildMember;
  if (isUpgrade) {
    try {
      updatedMember = await member.roles.add(rolesToAddOrRemove);
    } catch (error) {
      logger.error(error);
      return {
        error: "cannot add role(s) to user",
      };
    }
  } else {
    try {
      updatedMember = await member.roles.remove(rolesToAddOrRemove);
    } catch (error) {
      logger.error(error);
      return {
        error: "cannot remove role(s) from user",
      };
    }
  }

  updatedMember.send(params.message).catch(logger.error);

  return getUserResult(updatedMember);
}
