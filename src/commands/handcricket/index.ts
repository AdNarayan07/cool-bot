import {
  ActionRowBuilder,
  ButtonBuilder,
  type CommandInteraction,
  type MessageActionRowComponentBuilder,
  type Interaction,
  type Awaitable,
  type User,
  ButtonStyle,
} from "discord.js";
import { replyWithCheck } from "../../functions.js";
import toss from "./toss.js";
import play from "./play.js";

export default async function (interaction: CommandInteraction) {
  const mentioned = interaction.options.get("opponent")?.user;
  if (!mentioned)
    return await replyWithCheck(interaction, {
      content: "Mention Someone!",
      ephemeral: true,
    });

  if (mentioned.bot)
    return await replyWithCheck(interaction, {
      content: "You can't play with a bot you fool",
      ephemeral: true,
    });

  if (mentioned === interaction.user)
    return await replyWithCheck(interaction, {
      content:
        "Seriously? You wanna play with yourself? <a:tg_smh:1003305044050972672>",
      ephemeral: true,
    });

  const confirmPlayButtons = Y_N_buttons;

  const message = await replyWithCheck(interaction, {
    content: `Yo ${mentioned}, ${interaction.user} wants a match of hand cricket with you. Are you ready? You have \`1 minute\` to respond.`,
    components: [confirmPlayButtons],
    fetchReply: true,
  });

  if (!message) return;

  const confirmPlayFilter = (
    confirmPlayInteraction: Interaction
  ): Awaitable<boolean> => {
    if (!confirmPlayInteraction.isButton()) return false;
    if (confirmPlayInteraction.message.id !== message.id) {
      console.log("Old");
      return false;
    } else if (confirmPlayInteraction.user.id === interaction.user.id) {
      confirmPlayInteraction.reply({
        content: "Yo yo slowdown, wait for your opponent.",
        ephemeral: true,
      });
      return false;
    } else if (confirmPlayInteraction.user.id === mentioned?.id) return true;
    else {
      confirmPlayInteraction.reply({
        content: "Sorry yaar, you have not been invited to this game.",
        ephemeral: true,
      });
      return false;
    }
  };

  const confirmPlayCollector = message.createMessageComponentCollector({
    filter: confirmPlayFilter,
    time: 60000,
    max: 1,
  });

  confirmPlayCollector.on("collect", async (confirmPlayInteraction) => {
    if (!confirmPlayInteraction.isButton()) return;
    const response = confirmPlayInteraction.customId;
    if (response === "yes") {
      let toss_result = await toss(
        interaction,
        confirmPlayInteraction,
        mentioned,
        message
      );
      if (!toss_result) return console.log("No toss result", toss_result);
      await play(message, interaction, toss_result);
    } else if (response === "no") {
      const responseRejectedMsg = "TBD";
      await replyWithCheck(interaction, {
        content: responseRejectedMsg,
        components: [],
      });
    }
  });

  confirmPlayCollector.on("end", async (clicks) => {
    if (clicks.size > 0) return;
    await replyWithCheck(interaction, {
      content: "TBD",
      components: [],
    });
  });
}

export const NUM_BTN_ROW_1 =
  new ActionRowBuilder<MessageActionRowComponentBuilder>({
    components: [
      new ButtonBuilder({
        custom_id: "1",
        style: ButtonStyle.Secondary,
        emoji: "1035593474310934560",
      }),
      new ButtonBuilder({
        custom_id: "2",
        style: ButtonStyle.Primary,
        emoji: "1035593108202717346",
      }),
      new ButtonBuilder({
        custom_id: "3",
        style: ButtonStyle.Success,
        emoji: "1035593534092357653",
      }),
    ],
  });

export const NUM_BTN_ROW_2 =
  new ActionRowBuilder<MessageActionRowComponentBuilder>({
    components: [
      new ButtonBuilder({
        custom_id: "4",
        style: ButtonStyle.Success,
        emoji: "1035593580783337524"
      }),
      new ButtonBuilder({
        custom_id: "5",
        style: ButtonStyle.Primary,
        emoji: "1035593648378749028"
      }),
      new ButtonBuilder({
        custom_id: "6",
        style: ButtonStyle.Danger,
        emoji: "1035593706734096454"
      })
    ],
  });

export const Y_N_buttons =
  new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    new ButtonBuilder({
      custom_id: "yes",
      label: "Yes",
      style: ButtonStyle.Primary,
      emoji: "1019133467226808370"
    }),
    new ButtonBuilder({
      custom_id: "no",
      label: "No",
      style: ButtonStyle.Secondary,
      emoji: "1019133960883814400"
    })
  );
