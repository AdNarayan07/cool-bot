import dotenv from "dotenv";
dotenv.config();

import { Client, REST, Routes } from "discord.js";
import { ActivityType, IntentsBitField } from "discord.js";
import { readdir } from "fs/promises";
import path from "path";
import commands from "./commands/slashes.js";

if (!process.env.token) {
  throw Error("Could not find token in your environment");
}

const rest = new REST({ version: "10" }).setToken(process.env.token);

export const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.GuildVoiceStates,
  ],
});

client.once("ready", async (client) => {
  client.user?.setActivity({
    name: "Hand Cricket",
    type: ActivityType.Playing,
  });
  console.log("Bot started");
  const guilds = await client.guilds.fetch();

  for (const guild of guilds) {
    await rest.put(Routes.applicationGuildCommands(client.user.id, guild[0]), {
      body: [],
    });
    console.log(
      `Successfully deleted all guild-specific commands for guild ID: ${guild[0]}`
    );
  }
  let commandsData = commands.map((command)=>command.data);
  await rest.put(Routes.applicationCommands(client.user.id), { body: commandsData });
  console.log("Successfully registered global commands")
});

const eventFiles = await readdir(path.join("src", "events"));
eventFiles.forEach(async (file) => {
  const { default: event } = await import("./events/" + file.replace(".ts",".js"));
  client.on(file.split(".")[0], (...args) => {
    try {
      event(client, ...args);
    } catch (e) {
      console.log(e);
    }
  });
});

await client.login(process.env.token);
