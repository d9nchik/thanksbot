"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTopThanksGiver = exports.getUserIDByTag = exports.getUserIDByChatId = exports.createUser = exports.getUserID = exports.storeSendLike = exports.getSendCount = exports.getLikesCount = void 0;
const dotenv_1 = require("dotenv");
const pg_1 = require("pg");
(0, dotenv_1.config)();
const pool = new pg_1.Pool({
    connectionString: process.env.DB_STRING ||
        'postgresql://postgres:password@localhost:5432/postgres',
});
async function getLikesCount(chat_id) {
    try {
        const res = await pool.query('SELECT COUNT(*) AS count FROM thanks.message WHERE receiver_id=(SELECT id FROM thanks."user" WHERE chat_id=$1);', [chat_id]);
        if (res.rows.length === 0) {
            return 0;
        }
        return res.rows[0].count;
    }
    catch (err) {
        return 0;
    }
}
exports.getLikesCount = getLikesCount;
async function getSendCount(chat_id) {
    try {
        const res = await pool.query('SELECT COUNT(*) AS count FROM thanks.message WHERE sender_id=(SELECT id FROM thanks."user" WHERE chat_id=$1);', [chat_id]);
        if (res.rows.length === 0) {
            return 0;
        }
        return res.rows[0].count;
    }
    catch (err) {
        return 0;
    }
}
exports.getSendCount = getSendCount;
async function storeSendLike(sender, receiver) {
    try {
        await pool.query('INSERT INTO thanks.message (sender_id, receiver_id) VALUES ($1, $2)', [sender, receiver]);
        await pool.query('UPDATE thanks."user" SET likes=((SELECT likes FROM thanks."user" WHERE id=$1)+1) WHERE id=$1', [receiver]);
        await pool.query('UPDATE thanks."user" SET likes_given=((SELECT likes_given FROM thanks."user" WHERE id=$1)+1) WHERE id=$1', [sender]);
    }
    catch (err) {
        console.log(err);
    }
}
exports.storeSendLike = storeSendLike;
async function getUserID(chatID, firstName, lastName, userName) {
    const userID = await getUserIDByChatId(chatID);
    if (userID) {
        return userID;
    }
    return createUser(chatID, firstName, lastName, userName);
}
exports.getUserID = getUserID;
async function createUser(chatID, firstName, lastName, userName) {
    try {
        const res = await pool.query(`INSERT INTO thanks.user (chat_id, telegram_tag, username)
                                  VALUES ($1, $2, $3) RETURNING id;`, [chatID, userName, `${firstName} ${lastName}`]);
        return res.rows[0].id;
    }
    catch {
        return 0;
    }
}
exports.createUser = createUser;
async function getUserIDByChatId(chatID) {
    try {
        const res = await pool.query('SELECT id FROM thanks."user" WHERE chat_id=$1', [chatID]);
        if (res.rows.length === 0) {
            return null;
        }
        return res.rows[0].id;
    }
    catch {
        return null;
    }
}
exports.getUserIDByChatId = getUserIDByChatId;
async function getUserIDByTag(tag) {
    try {
        const res = await pool.query('SELECT id, chat_id  FROM thanks."user" WHERE telegram_tag=$1', [tag]);
        if (res.rows.length === 0) {
            return null;
        }
        const row = res.rows[0];
        return { id: row.id, chat_id: row.chat_id };
    }
    catch {
        return null;
    }
}
exports.getUserIDByTag = getUserIDByTag;
async function getTopThanksGiver() {
    try {
        const res = await pool.query(`WITH t1 AS (
                                      SELECT count(*), sender_id FROM thanks.message WHERE created_at > now() - INTERVAL '10 DAY' GROUP BY sender_id)
                                  SELECT username
                                  FROM t1
                                          JOIN thanks."user" u ON u.id = t1.sender_id
                                  ORDER BY likes_given DESC
                                  LIMIT 10;`);
        return res.rows.map(({ username }) => username);
    }
    catch (err) {
        console.log(err);
        return [];
    }
}
exports.getTopThanksGiver = getTopThanksGiver;
