import { GuardFunction } from "@typeit/discord";

const IsAPrivateMessage: GuardFunction<"message"> = async (
  [message],
  _,
  next
) => {
  if (message.channel.type === "dm") {
    await next();
  }
};

export default IsAPrivateMessage;
