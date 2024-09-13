import { Client, Interaction } from "discord.js";
import commands from "../commands/slashes.js";

export default async (client: Client, interaction: Interaction) => {
  if (!interaction.isCommand()) return;
  const command = commands.get(interaction.commandName)
  if (!command) return;
  try {
    command.execute(interaction)
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error executing that command!",
      ephemeral: true,
    });
  }
};
