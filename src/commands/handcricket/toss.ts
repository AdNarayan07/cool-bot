import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type User,
  type MessageActionRowComponentBuilder,
  type CommandInteraction,
  type Message,
  type Interaction,
  type InteractionResponse,
  type Awaitable,
  ButtonInteraction,
} from "discord.js";
import { replyWithCheck, shuffleArray } from "../../functions.js";
import { NUM_BTN_ROW_1, NUM_BTN_ROW_2 } from "./index.js";

export default async function (
  interaction: CommandInteraction,
  confirmPlayInteraction: ButtonInteraction,
  mentioned: User,
  message: Message | InteractionResponse
): Promise<Record<'bat1' | 'bat2', User> | undefined> {
  const shuffledUsers = shuffleArray([interaction.user, mentioned]);
  const odd_even_choser = shuffledUsers[0];
  const other_player = shuffledUsers[1];

  const Embed = new EmbedBuilder({
    title: `🏏 ${interaction.user} v/s ${mentioned}`,
    description: `Toss Happening Commentary`,
  });
  const odd_even_buttons =
    new ActionRowBuilder<MessageActionRowComponentBuilder>({
      components: [
        new ButtonBuilder({
          custom_id: "odd",
          label: "Odd",
          style: ButtonStyle.Primary
        }),
        new ButtonBuilder({
          custom_id: "even",
          label: "Even",
          style: ButtonStyle.Secondary
        })
      ]
    })

  await confirmPlayInteraction.update({
    content: `${odd_even_choser} \`Odd or Even?\``,
    embeds: [Embed],
    components: [odd_even_buttons],
  });

  const odd_even_filter = (
    odd_even_interaction: Interaction
  ): Awaitable<boolean> => {
    if (!odd_even_interaction.isButton()) return false;
    if (odd_even_interaction.message.id !== message.id) {
      console.log("OLD");
      return false;
    }
    else if (odd_even_interaction.user.id === other_player.id) {
      odd_even_interaction.reply({
        content: "Let your opponent choose.",
        ephemeral: true,
      }).catch(e => console.error(e));
      return false;
    }
    else if (odd_even_interaction.user.id === odd_even_choser.id) return true;
    else {
      odd_even_interaction.reply({
        content: "You're not in game lol",
        ephemeral: true,
      }).catch(e => console.error(e));
      return false;
    }
  };

  const odd_even_collector = message.createMessageComponentCollector({
    filter: odd_even_filter,
    time: 60000,
    max: 1,
  });

  return new Promise((resolve)=>{
    let result: Record<'bat1' | 'bat2', User> | undefined;
    odd_even_collector.on("collect", async (odd_even_interaction) => {
      if(!odd_even_interaction.isButton()) return;
      let response = odd_even_interaction.customId;
      const toss_result = await toss(response, odd_even_interaction);
      if(!toss_result) return resolve(undefined);
      else {
        result = await bat_or_ball(toss_result);
        return resolve(result);
      }
    });
  
    odd_even_collector.on("end", async (clicks)=>{
      if (clicks.size > 0) return;
      else {
        odd_even_buttons.components.forEach((component)=>component.setDisabled(true));
        const comments = "comments generate/ odd even end"
        await replyWithCheck(interaction, {
          content: "",
          embeds: [Embed.setDescription(comments)],
          components: [odd_even_buttons],
        });
        return resolve(undefined)
      }
    })
  })

  //-------------------------------------//

  async function toss(odd_even_response: string | undefined, odd_even_interaction: ButtonInteraction): Promise<Record<'toss_winner' | 'toss_loser', User> | undefined> {
    const toss_row_1 = NUM_BTN_ROW_1
    const toss_row_2 = NUM_BTN_ROW_2

    await odd_even_interaction.update({
      content: `${odd_even_choser} and ${other_player}, please select a number!`,
      embeds: [
        Embed.setDescription(
          `${odd_even_choser} chose ${odd_even_response}! Now is the time for determining the winner.`
        ),
      ],
      components: [toss_row_1, toss_row_2],
      fetchReply: true,
    });

    let clicked: string[] = [];
    const toss_filter = (tossInteraction: Interaction): Awaitable<boolean> => {
      if (!tossInteraction.isButton()) return false;
      if (tossInteraction.message.id !== message.id) {
        console.log("Old");
        return false;
      }
      if (clicked.includes(tossInteraction.user.id)) {
        tossInteraction.reply({
          content: "You have already selected your choice.",
          ephemeral: true,
        }).catch(e => console.error(e));
        return false;
      }
      if (
        tossInteraction.user.id === odd_even_choser.id ||
        tossInteraction.user.id === other_player.id
      )
        return true;
      else {
        tossInteraction.reply({
          content: "You're not in game lol",
          ephemeral: true,
        }).catch(e => console.error(e));
        return false;
      }
    };
    const toss_collector = message.createMessageComponentCollector({
      filter: toss_filter,
      time: 60000,
      max: 2,
    });

    return new Promise((resolve)=>{
      if(!odd_even_response) return resolve(undefined);
      
      toss_collector.on("collect", async (tossInteraction) => {
        if (!tossInteraction.isButton()) return resolve(undefined);
        clicked.push(tossInteraction.user.id);
        await tossInteraction.reply({
          content: `You chose ${tossInteraction.customId}`,
          ephemeral: true,
        });
      });
  
      toss_collector.on("end", async (clicks) => {
        const disableButtonsAndReply = async (content: string) => {
          toss_row_1.components.forEach((component) => component.setDisabled(true));
          toss_row_2.components.forEach((component) => component.setDisabled(true));
          await replyWithCheck(interaction, {
            content: "",
            embeds: [Embed.setDescription(content)],
            components: [toss_row_1, toss_row_2],
          });
        };
        switch (clicks.size) {
          case 0:
            await disableButtonsAndReply("content");
            resolve(undefined);
            break;
  
          case 1:
            let offender =
              clicks.first()?.user === odd_even_choser
                ? other_player
                : odd_even_choser;
            await disableButtonsAndReply("content");
            resolve(undefined);
            break;
  
          default:
            const toss_entries: Record<string, string> = clicks.reduce(
              (acc, click) => {
                return { ...acc, [click.user.id]: click.customId };
              },
              {} as Record<string, string>
            );
            const odd_or_even =
             (parseInt(toss_entries[odd_even_choser.id]) +
              parseInt(other_player.id)) % 2 === 0
              ? "even" : "odd";
  
            const [toss_winner, toss_loser] =
              odd_or_even === odd_even_response
                ? [odd_even_choser, other_player]
                : [other_player, odd_even_choser];
            
             return resolve({
              toss_winner, toss_loser
            })
        }
      });
    })
  }

  //------------------------------//

  async function bat_or_ball(toss_result: Record<'toss_winner' | 'toss_loser', User>): Promise<Record<'bat1' | 'bat2', User> | undefined> {
    const { toss_winner, toss_loser } = toss_result;
    const choose_bat_or_ball = 
    new ActionRowBuilder<MessageActionRowComponentBuilder>({
      components: [
        new ButtonBuilder({
          custom_id: "bat",
          label: "Bat",
          style: ButtonStyle.Primary,
          emoji: "1029003363758637067"
        }),
        new ButtonBuilder({
          custom_id: "ball",
          label: "Ball",
          style: ButtonStyle.Success,
          emoji: "1029003371199340554"
        })
      ]
    })

    await replyWithCheck(interaction, {
      content: "Bat or Ball?",
      embeds: [Embed],
      components: [choose_bat_or_ball],
    });

    const bat_or_ball_filter = (batBallInteraction: Interaction): Awaitable<boolean> => {
      if (!batBallInteraction.isButton()) return false;
      if (batBallInteraction.message.id !== message.id) {
        console.log("Old");
        return false;
      }
      else if (batBallInteraction.user.id === toss_loser.id) {
        batBallInteraction.reply({
          content: "You lost the toss.",
          ephemeral: true,
        }).catch(e => console.error(e));
        return false
      }
      else if(batBallInteraction.user.id === toss_winner.id) return true
      else {
        batBallInteraction.reply({
          content: "You're not in game lol",
          ephemeral: true,
        }).catch(e => console.error(e));
        return false;
      }
    };

    const bat_or_ball_collect = message.createMessageComponentCollector({
      filter: bat_or_ball_filter,
      time: 60000,
      max: 1,
    });

    return new Promise((resolve)=>{
      let data: Record<'bat1' | 'bat2', User> | undefined;
      bat_or_ball_collect.on("collect", async (batBallInteraction)=>{
        const [bat1, bat2] = 
        batBallInteraction.customId === "bat" ?
        [toss_winner, toss_loser] : 
        [toss_loser, toss_winner]
        await batBallInteraction.update({
          content: "",
          components: [],
          embeds: [Embed.setDescription(`
            ${toss_winner} won the toss and elected to ${batBallInteraction.customId} first!
            \nGet ready for the Match. 
            \n> Starting in <a:counter:1029040101390549072>
            `)]
        })
        data = {
          bat1, bat2
        }
        setTimeout(()=>resolve(data),3000)
        return;
      })
      bat_or_ball_collect.on("end", async (clicks)=>{
        if(clicks.size > 0) return resolve(data);
        const comment = "Generate comment"
        choose_bat_or_ball.components.forEach((component)=>component.setDisabled(true))
        await replyWithCheck(interaction, {
          content: "",
          embeds: [Embed.setDescription(comment)],
          components: [choose_bat_or_ball],
        });
        return resolve(undefined);
      })
    })
  }
}
