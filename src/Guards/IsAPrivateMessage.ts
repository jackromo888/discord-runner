import { GuardFunction } from "@typeit/discord";

export const IsAPrivateMessage: GuardFunction<"message"> = async (
  [message],
  _,
  next
) => {
  if (message.channel.type == "dm") {
    await next();
  }
};
