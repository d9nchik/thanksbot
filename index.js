"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const telegraf_1 = require("telegraf");
const db_1 = require("./src/db");
(0, dotenv_1.config)();
const bot = new telegraf_1.Telegraf(process.env.BOT_TOKEN || '');
bot.help(ctx => ctx.reply('Send me a sticker'));
bot.command('sendLike', async (ctx) => {
    const messageParts = ctx.message.text.split(' ');
    const chat = ctx.chat;
    if (chat.type === 'private' && chat.last_name && chat.username) {
        if (messageParts.length == 2) {
            const userID = await (0, db_1.getUserID)(chat.id, chat.first_name, chat.last_name, chat.username);
            const receiver = await (0, db_1.getUserIDByTag)(messageParts[1]);
            if (receiver) {
                (0, db_1.storeSendLike)(userID, receiver.id);
                ctx.telegram.sendMessage(receiver.chat_id, 'You earn like');
                return ctx.reply(`Send like ${messageParts[1]}`);
            }
            return ctx.reply('User not exists');
        }
        return ctx.reply('You should provide receiver name!');
    }
    return ctx.reply('You can send like only in chat with me');
});
bot.command('start', async (ctx) => {
    const chat = ctx.chat;
    if (chat.type === 'private' && chat.last_name && chat.username) {
        await (0, db_1.getUserID)(chat.id, chat.first_name, chat.last_name, chat.username);
    }
    return ctx.reply(`Hi👋!\n Write /sendLike to give a thanks for someone`);
});
bot.command('likes', async (ctx) => {
    const chat = ctx.chat;
    if (chat.type === 'private' && chat.last_name && chat.username) {
        return ctx.reply(`Your likes: ${await (0, db_1.getLikesCount)(chat.id)}`);
    }
    return ctx.reply('You can send like only in chat with me');
});
bot.command('sendCount', async (ctx) => {
    const chat = ctx.chat;
    if (chat.type === 'private' && chat.last_name && chat.username) {
        return ctx.reply(`Your send likes: ${await (0, db_1.getSendCount)(chat.id)}`);
    }
    return ctx.reply('You can send like only in chat with me');
});
bot.command('topGiver', async (ctx) => {
    return ctx.reply((await (0, db_1.getTopThanksGiver)()).map((e, i) => `${i + 1}) ${e}`).join('\n'));
});
bot.on('sticker', ctx => ctx.reply(''));
bot.hears('hi', ctx => ctx.reply('Hey there'));
bot.launch();
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
