import { config } from 'dotenv';
import { Telegraf } from 'telegraf';
import {
  getTopUser,
  getUserID,
  getUserIDByTag,
  storeSendLike,
  getLikesCount,
  getSendCount,
  getTopThanksGiver,
  getTopThanksReceiver,
  addPersonalMessage,
  getAdminChatId,
  sendUserMessageByID,
  banUser,
  isBanned,
} from './src/db';
config();
// tag with or without @
let topUser: number[] = [];
(async () => {
  topUser = await getTopUser();
})();

setInterval(async () => {
  topUser = await getTopUser();
  console.log(topUser);
}, 1000 * 60 * 60 * 24 * 7);

let adminAccounts: number[] = [];

(async () => {
  adminAccounts = await getAdminChatId();
})();

setInterval(async () => {
  adminAccounts = await getAdminChatId();
}, 1000 * 60);

const bot = new Telegraf(process.env.BOT_TOKEN || '');

bot.command('send_like', async ctx => {
  const messageParts = ctx.message.text.split(' ');
  const chat = ctx.chat;
  if (chat.type === 'private' && chat.username) {
    if (messageParts.length == 2) {
      const userID = await getUserID(
        chat.id,
        chat.first_name,
        chat.last_name ? chat.last_name : '',
        chat.username
      );
      if (await isBanned(userID)) {
        return ctx.reply("You're banned. You can only receive message");
      }

      const receiver = await getUserIDByTag(messageParts[1]);
      if (receiver) {
        if (userID === receiver.id) {
          return ctx.reply('Self liking is forbidden');
        }
        storeSendLike(userID, receiver.id);
        ctx.telegram.sendMessage(receiver.chat_id, 'You earn like');
        return ctx.reply(`Send like ${messageParts[1]}`);
      }
      return ctx.reply('User not exists');
    }

    return ctx.reply('You should provide receiver name!');
  }
  return ctx.reply('You can send like only in chat with me');
});

bot.command('start', async ctx => {
  const chat = ctx.chat;
  if (chat.type === 'private' && chat.username) {
    await getUserID(
      chat.id,
      chat.first_name,
      chat.last_name ? chat.last_name : '',
      chat.username
    );
  }
  return ctx.reply(`Hi????!\n Write /sendLike to give a thanks for someone`);
});

bot.command('likes', async ctx => {
  const chat = ctx.chat;
  if (chat.type === 'private' && chat.username) {
    return ctx.reply(`Your likes: ${await getLikesCount(chat.id)}`);
  }
  return ctx.reply('You can send like only in chat with me');
});

bot.command('send_count', async ctx => {
  const chat = ctx.chat;
  if (chat.type === 'private' && chat.username) {
    return ctx.reply(`Your send likes: ${await getSendCount(chat.id)}`);
  }
  return ctx.reply('You can send like only in chat with me');
});

bot.command('send_message', async ctx => {
  const chat = ctx.chat;
  if (chat.type === 'private' && chat.username) {
    const userID = await getUserID(
      chat.id,
      chat.first_name,
      chat.last_name ? chat.last_name : '',
      chat.username
    );
    if (await isBanned(userID)) {
      return ctx.reply("You're banned. You can only receive message");
    }

    if (topUser.includes(chat.id)) {
      const messageParts = ctx.message.text.split(' ');
      if (messageParts.length <= 2) {
        return ctx.reply('You should provide user nickname(tag) and text');
      }
      const receiver = await getUserIDByTag(messageParts[1]);
      if (receiver) {
        if (userID === receiver.id) {
          return ctx.reply('Self liking is forbidden');
        }
        const message = messageParts.slice(2).join(' ');
        const messageID = await addPersonalMessage(
          userID,
          receiver.id,
          message
        );
        if (message === null) {
          return ctx.reply(
            'Oops, try again to resend your message after a while'
          );
        }
        adminAccounts.forEach(chat_id =>
          ctx.telegram.sendMessage(
            chat_id,
            `UserID: ${userID}\nMessage ID:${messageID}\nMessage:${message}`
          )
        );
        return ctx.reply('Your message will be proceeded by administrator');
      }
      return ctx.reply('User not exists');
    }
    return ctx.reply('Only top user can send personal message');
  }
  return ctx.reply('You can send like only in chat with me');
});

bot.command('send_user_message', async ctx => {
  const chat = ctx.chat;
  if (chat.type === 'private' && chat.username) {
    if (adminAccounts.includes(chat.id)) {
      const messageParts = ctx.message.text.split(' ');
      if (messageParts.length == 2) {
        const message = await sendUserMessageByID(Number(messageParts[1]));
        if (message) {
          ctx.telegram.sendMessage(
            message.receiverID,
            `You get thanks: ${message.message}`
          );
          ctx.telegram.sendMessage(
            message.senderID,
            `Message Approved: "${message.message}"`
          );
          return ctx.reply(`Message ${messageParts[1]} approved`);
        }
        return ctx.reply('Message already approved');
      }
      return ctx.reply('Provide message id');
    }
    return ctx.reply('You are not admin');
  }
  return ctx.reply('You can send like only in chat with me');
});

bot.command('ban', async ctx => {
  const chat = ctx.chat;
  if (chat.type === 'private' && chat.username) {
    if (adminAccounts.includes(chat.id)) {
      const messageParts = ctx.message.text.split(' ');
      if (messageParts.length == 2) {
        await banUser(Number(messageParts[1]));
        return ctx.reply('User banned');
      }
      return ctx.reply('Provide user id');
    }
    return ctx.reply('You are not admin');
  }
  return ctx.reply('You can send like only in chat with me');
});

bot.command('top_giver', async ctx => {
  return ctx.reply(
    (await getTopThanksGiver()).map((e, i) => `${i + 1}) ${e}`).join('\n')
  );
});

bot.command('top_receiver', async ctx => {
  return ctx.reply(
    (await getTopThanksReceiver()).map((e, i) => `${i + 1}) ${e}`).join('\n')
  );
});

bot.on('sticker', ctx => ctx.reply('????'));
bot.hears('hi', ctx => ctx.reply('Hey there'));
bot.help(ctx =>
  ctx.replyWithMarkdown(`*send_like* - provide a nickname(tag) to send thanks
*likes* - your total like count
*send_count* - your total send like count
*top_giver* - users that are top giver by last 7 days
*top_receiver* - users who received a lot of likes in last 7 days
*send_message* - user who are topGiver and topReceiver can send personal message
*send_user_message* - approve personal message (only admin)
*ban* - ban user (only admin)
*help* - all of those commands`)
);
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
