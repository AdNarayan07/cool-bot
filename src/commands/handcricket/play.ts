import {
  CommandInteraction,
  User,
  EmbedBuilder,
  ActionRowBuilder,
  MessageActionRowComponentBuilder,
  ButtonBuilder,
  ButtonStyle,
  Message,
  InteractionResponse,
  Interaction,
  Awaitable,
} from "discord.js";
import { replyWithCheck, sleep } from "../../functions.js";
import { NUM_BTN_ROW_1, NUM_BTN_ROW_2, Y_N_buttons } from "./index.js";

export default async function (
  message: InteractionResponse | Message,
  interaction: CommandInteraction,
  players: Record<"bat1" | "bat2", User>
) {
  const { bat1, bat2 } = players;

  class Score {
    runs = 0;
    balls = 0;
    wicket = 0;
    timeline: string[] = [];
    inningOverReason: InningsOverReason | undefined;
  }

  const scorecard: Record<1 | 2, Score> = {
    1: new Score(),
    2: new Score(),
  };

  enum InningsOverReason {
    "Time Up",
    "Batter Out",
    "Innings Declared",
    "Target Achieved",
  }

  function generateScorecardDescription(score: Score) {
    return `━━━━━━━━━━━━━━━━━━━━━━
            \n**<:cricket:1029003363758637067> ${score.runs}/${score.wicket}**
            \n\n<:cricketball:1029003371199340554> ${Math.floor(score.balls / 6)}.${score.balls % 6} overs
            \n──────────────────────`;
  }
  const heading = new EmbedBuilder({
    title: `🏏 ${bat1} v/s ${bat2}`,
    description: `Get ready for the match. ${bat2} is ready with the first ball. ${bat1} ready to face. And there we go!`,
    color: 0xffffff,
  });

  const bat1scores = new EmbedBuilder({
    title: bat1.displayName,
    description: generateScorecardDescription(scorecard[1]),
    thumbnail: {
      url: bat1.displayAvatarURL(),
    },
    color: 0x008000,
  });

  const bat2scores = new EmbedBuilder({
    title: bat2.displayName,
    description: generateScorecardDescription(scorecard[2]),
    thumbnail: {
      url: bat2.displayAvatarURL(),
    },
    color: 0xff0000,
  });

  while (scorecard[1].inningOverReason === undefined) await playMoves(1, bat1, bat2);
  await sleep(5000)
  heading.setDescription(
    `${bat2} has to chase a target of ${scorecard[1].runs + 1}}`
  );
  await replyWithCheck(interaction, {
    content: "Innings Break, next innings upcoming in `5 seconds`",
    embeds: [heading, bat1scores, bat2scores],
  });
  await sleep(5000);
  while (scorecard[2].inningOverReason === undefined) await playMoves(2, bat2, bat1);
  await sleep(5000)
  await finalizeResult();

  async function playMoves(
    inning: 1 | 2,
    batsman: User,
    bowler: User
  ): Promise<void> {
    const moves_row_1 = new ActionRowBuilder<MessageActionRowComponentBuilder>({
      ...NUM_BTN_ROW_1
    });
    const moves_row_2 = new ActionRowBuilder<MessageActionRowComponentBuilder>({
      ...NUM_BTN_ROW_2
    });
    const declare_button =
      new ActionRowBuilder<MessageActionRowComponentBuilder>({
        components: [
          new ButtonBuilder({
            custom_id: "declare",
            label: "Declare Innings",
            style: ButtonStyle.Danger,
            disabled: inning == 2,
          }),
        ],
      });
    
    await sleep(3000);
    await replyWithCheck(interaction, {
      content: "Let's Play",
      embeds: [heading, bat1scores, bat2scores],
      components: [moves_row_1, moves_row_2, declare_button],
    });

    let clicks: string[] = [];
    const playFilter = (playInteraction: Interaction): Awaitable<boolean> => {
      if (!playInteraction.isButton()) return false;
      if (playInteraction.message.id !== message.id) {
        console.log("Old");
        return false;
      } else if (clicks.includes(playInteraction.user.id)) {
        playInteraction.reply({
          content:
            "You already have selected your move, wait for the opponent!",
          ephemeral: true,
        });
        return false;
      } else if (
        playInteraction.customId === "declare" &&
        playInteraction.user.id === bowler.id
      ) {
        playInteraction.reply({
          content: "Only batsman can declare their innings!",
          ephemeral: true,
        });
        return false;
      } else if (
        playInteraction.user.id === batsman.id ||
        playInteraction.user.id === bowler.id
      )
        return true;
      else {
        playInteraction.reply({
          content: "You are not a part of this game!",
          ephemeral: true,
        });
        return false;
      }
    };
    const playCollector = message.createMessageComponentCollector({
      filter: playFilter,
      time: 60000,
      max: 2,
    });
    return new Promise((resolve) => {
      playCollector.on("collect", async (playInteraction) => {
        if (
          playInteraction.customId === "declare" &&
          playInteraction.user.id === batsman.id
        ) {
          const confirmDeclareMessage = await playInteraction.reply({
            content: `${batsman}, Do you want to declare your innings?`,
            ephemeral: true,
            components: [Y_N_buttons],
            fetchReply: true,
          });

          const declareCollector =
            confirmDeclareMessage.createMessageComponentCollector({
              time: 15000,
            });

          declareCollector.on("collect", async (declareInteraction) => {
            if (declareInteraction.customId === "yes") {
              scorecard[inning].inningOverReason =
                InningsOverReason["Innings Declared"];
              await playInteraction.editReply({
                content: "Innings Declared!",
                components: [],
              });
              return resolve();
            } else {
              await playInteraction.editReply({
                content: "Innings Not Declared!",
                components: [],
              });
            }
          });

          declareCollector.on("end", async (_, reason) => {
            if (reason === "time") {
              await playInteraction.editReply({
                  content: "Innings Not Declared!",
                  components: [],
                });
            }
          });
        } else {
          clicks.push(playInteraction.user.id);
          await playInteraction.deferUpdate();
        }

        playCollector.on("end", async (_clicks) => {
          const moves = _clicks.reduce(
            (acc, click) => {
              return { ...acc, [click.user.id]: click.customId };
            },
            {} as Record<string, string>
          );
          clicks = [];
          const { [batsman.id]: batsmanInput, [bowler.id]: bowlerInput } =
            moves;
          if (!batsmanInput || !bowlerInput){
            replyWithCheck(interaction, {
              content: "Didn't recieve two inputs",
              embeds: [heading.setDescription(`\`bat:${batsmanInput}\`\`ball: ${bowlerInput}\``)]
            })
          }
          if (batsmanInput == bowlerInput) {
            scorecard[inning].wicket += 1;
            scorecard[inning].timeline.push("W");
            scorecard[inning].inningOverReason =
              InningsOverReason["Batter Out"];

            const commentary = "Generate comments for out";
            heading.setDescription(commentary);
            bat1scores.setDescription(
              generateScorecardDescription(scorecard[1])
            );
            bat2scores.setDescription(
              generateScorecardDescription(scorecard[2])
            );
            [moves_row_1, moves_row_2, declare_button].forEach((row) => {
              row.components.forEach((component) => {
                component.setDisabled(true);
              });
            });
            await replyWithCheck(interaction, {
              embeds: [heading, bat1scores, bat2scores],
              components: [moves_row_1, moves_row_2, declare_button],
            });
          } else {
            scorecard[inning]["runs"] += parseInt(batsmanInput);
            scorecard[inning]["balls"] += 1;
            scorecard[inning]["timeline"].push(batsmanInput);

            const commentary = "Comments for score";
            heading.setDescription(commentary);
            if (inning === 2 && scorecard[2].runs > scorecard[1].runs) {
                scorecard[2].inningOverReason =
                  InningsOverReason["Target Achieved"];
    
                const commentary = "Generate comments for achieved target";
                heading.setDescription(commentary);
                [moves_row_1, moves_row_2, declare_button].forEach((row) => {
                  row.components.forEach((component) => {
                    component.setDisabled(true);
                  });
                });
            }
            bat1scores.setDescription(generateScorecardDescription(scorecard[1]));
            bat2scores.setDescription(generateScorecardDescription(scorecard[2]));
            await replyWithCheck(interaction, {
              embeds: [heading, bat1scores, bat2scores],
              components: [moves_row_1, moves_row_2, declare_button],
            });
          }
          resolve();
        });
      });
    });
  }

  async function finalizeResult() {
    const winner =
      scorecard[1].runs > scorecard[2].runs
        ? `${bat1} Won!`
        : scorecard[1].runs < scorecard[2].runs
          ? `${bat2} Won!`
          : "Match Draw";
    
    heading.setDescription("Generate winner commentary")
    
    replyWithCheck(interaction, {
        content: winner,
        embeds: [heading, bat1scores, bat2scores]
    })
  }
}
