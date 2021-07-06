import { DiscordAPIError, GuildMember, User } from "discord.js";
import { ActionError, ErrorResult, UserResult } from "../api/types";
import { userJoined } from "../service";
import logger from "./logger";

const getUserResult = (member: GuildMember): UserResult => ({
  username: member.user.username,
  discriminator: member.user.discriminator,
  avatar: member.user.avatar,
  roles: member.roles.cache
    .filter((role) => role.id !== member.guild.roles.everyone.id)
    .map((role) => role.id),
});

const getErrorResult = (error: Error): ErrorResult => {
  let errorMsg: string;
  let ids: string[];
  if (error instanceof DiscordAPIError) {
    if (error.code === 50001) {
      // Missing access
      errorMsg = "guild not found";
    } else if (error.code === 10013) {
      // Unknown User
      errorMsg = "cannot fetch member";
    } else if (error.code === 10007) {
      // Unknown Member
      errorMsg = "user is not member";
    } else {
      errorMsg = "discord api error";
    }
  } else if (error instanceof ActionError) {
    errorMsg = error.message;
    ids = error.ids;
  } else {
    logger.error(error);
    errorMsg = "unknown error";
  }
  return {
    errors: [
      {
        msg: errorMsg,
        value: ids,
      },
    ],
  };
};

const logBackendError = (error) => {
  if (error.response?.data?.errors[0]?.msg) {
    logger.error(error.response.data.errors[0].msg);
  } else {
    logger.error(error);
  }
};

const handleJoinCode = async (joinCode: string, author: User) => {
  userJoined(joinCode, author.id, true).then((ok) => {
    const message = ok
      ? "You have successfully joined."
      : "Join failed. (wrong join code)";
    author.send(message);
  });
};

export { getUserResult, getErrorResult, logBackendError, handleJoinCode };
