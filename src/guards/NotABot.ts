import { ArgsOf, GuardFunction, SimpleCommandMessage } from "discordx";

const NotABot: GuardFunction<
  ArgsOf<"messageCreate"> | SimpleCommandMessage
> = async (message, _, next) => {
  const userIsNotABot =
    message instanceof SimpleCommandMessage
      ? !message?.message.author.bot
      : !message[0].author.bot;

  if (userIsNotABot) {
    await next();
  }
};

export default NotABot;
