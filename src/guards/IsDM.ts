import { ChannelType } from "discord.js";
import { ArgsOf, GuardFunction, SimpleCommandMessage } from "discordx";

const IsDM: GuardFunction<
  ArgsOf<"messageCreate"> | SimpleCommandMessage
> = async (message, _, next) => {
  const msgIsInDM =
    message instanceof SimpleCommandMessage
      ? message?.message.channel.type === ChannelType.DM
      : message[0].channel.type === ChannelType.DM;

  if (msgIsInDM) {
    await next();
  }
};

export default IsDM;
