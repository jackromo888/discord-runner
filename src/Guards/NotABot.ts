import { GuardFunction } from "@typeit/discord";

const NotABot: GuardFunction<"message"> = async ([message], _, next) => {
  if (!message.author.bot) {
    await next();
  }
};

export default NotABot;
