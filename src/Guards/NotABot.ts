import { GuardFunction } from "@typeit/discord";

export const NotABot: GuardFunction<"message"> = async ([message], _, next) => {
  if (!message.author.bot) {
    await next();
  }
};
