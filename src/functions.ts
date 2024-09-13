import {
  type ButtonInteraction,
  type CommandInteraction,
  type InteractionReplyOptions,
  type InteractionResponse,
  type Message,
  type MessagePayload,
} from "discord.js";
import { resolve } from "path";

export async function replyWithCheck(
  interaction: CommandInteraction,
  options: string | MessagePayload | InteractionReplyOptions
): Promise<InteractionResponse | Message | undefined> {
  try{
    if (interaction.replied || interaction.deferred) return await interaction.editReply(options)
    else return await interaction.reply(options)
  } catch(error) {
    console.error("Error in replyWithCheck:", error);
  }
}

export function shuffleArray<T>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

export async function sleep(ms: number) {
  return new Promise((resolve)=>{
    setTimeout(resolve, ms)
  })
}