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
} from './src/db';
config();

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
bot.help(ctx => ctx.reply('Send me a sticker'));
bot.command('sendLike', async ctx => {
  const messageParts = ctx.message.text.split(' ');
  const chat = ctx.chat;
  if (chat.type === 'private' && chat.last_name && chat.username) {
    if (messageParts.length == 2) {
      const userID = await getUserID(
        chat.id,
        chat.first_name,
        chat.last_name,
        chat.username
      );
      const receiver = await getUserIDByTag(messageParts[1]);
      if (receiver) {
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
  if (chat.type === 'private' && chat.last_name && chat.username) {
    await getUserID(chat.id, chat.first_name, chat.last_name, chat.username);
  }
  return ctx.reply(`Hi👋!\n Write /sendLike to give a thanks for someone`);
});

bot.command('likes', async ctx => {
  const chat = ctx.chat;
  if (chat.type === 'private' && chat.last_name && chat.username) {
    return ctx.reply(`Your likes: ${await getLikesCount(chat.id)}`);
  }
  return ctx.reply('You can send like only in chat with me');
});

bot.command('sendCount', async ctx => {
  const chat = ctx.chat;
  if (chat.type === 'private' && chat.last_name && chat.username) {
    return ctx.reply(`Your send likes: ${await getSendCount(chat.id)}`);
  }
  return ctx.reply('You can send like only in chat with me');
});

bot.command('sendMessage', async ctx => {
  const chat = ctx.chat;
  if (chat.type === 'private' && chat.last_name && chat.username) {
    const userID = await getUserID(
      chat.id,
      chat.first_name,
      chat.last_name,
      chat.username
    );
    if (topUser.includes(chat.id)) {
      const messageParts = ctx.message.text.split(' ');
      const receiver = await getUserIDByTag(messageParts[1]);
      if (receiver) {
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

bot.command('sendUserMessage', async ctx => {
  const chat = ctx.chat;
  if (chat.type === 'private' && chat.last_name && chat.username) {
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
  if (chat.type === 'private' && chat.last_name && chat.username) {
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

bot.command('topGiver', async ctx => {
  return ctx.reply(
    (await getTopThanksGiver()).map((e, i) => `${i + 1}) ${e}`).join('\n')
  );
});

bot.command('topReceiver', async ctx => {
  return ctx.reply(
    (await getTopThanksReceiver()).map((e, i) => `${i + 1}) ${e}`).join('\n')
  );
});

bot.on('sticker', ctx => ctx.reply(''));
bot.hears('hi', ctx => ctx.reply('Hey there'));
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
