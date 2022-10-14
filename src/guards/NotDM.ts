import { ChannelType } from "discord.js";
import { ArgsOf, GuardFunction, SimpleCommandMessage } from "discordx";

const NotDM: GuardFunction<
  ArgsOf<"messageCreate"> | SimpleCommandMessage
> = async (message, _, next) => {
  const msgIsNotInDM =
    message instanceof SimpleCommandMessage
      ? message?.message.channel.type !== ChannelType.DM
      : message[0].channel.type !== ChannelType.DM;

  if (msgIsNotInDM) {
    await next();
  }
};

export default NotDM;
