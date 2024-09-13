import {
  Collection,
  SlashCommandBuilder,
  type SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import handcricketExe from "./handcricket/index.js";

type command = {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder,
  execute: Function
}

const commands: Collection<string, command> = new Collection();
const handcricketData = 
  new SlashCommandBuilder()
  .setName("handcricket")
  .setDescription("Play the classic game of hand cricket with your friend!")
  .addUserOption((option) =>
    option
      .setName("opponent")
      .setDescription("Mention your opponent")
      .setRequired(true)
  )

commands.set("handcricket", {
  data: handcricketData,
  execute: handcricketExe
})

export default commands;