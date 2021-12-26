import { config } from 'dotenv';
import { Pool } from 'pg';

config();

const pool = new Pool({
  connectionString:
    process.env.DB_STRING ||
    'postgresql://postgres:password@localhost:5432/postgres',
});

export async function getLikesCount(chat_id: number): Promise<number> {
  try {
    const res = await pool.query(
      'SELECT COUNT(*) AS count FROM thanks.message WHERE receiver_id=(SELECT id FROM thanks."user" WHERE chat_id=$1);',
      [chat_id]
    );
    if (res.rows.length === 0) {
      return 0;
    }
    return res.rows[0].count;
  } catch (err) {
    return 0;
  }
}

export async function getSendCount(chat_id: number): Promise<number> {
  try {
    const res = await pool.query(
      'SELECT COUNT(*) AS count FROM thanks.message WHERE sender_id=(SELECT id FROM thanks."user" WHERE chat_id=$1);',
      [chat_id]
    );
    if (res.rows.length === 0) {
      return 0;
    }
    return res.rows[0].count;
  } catch (err) {
    return 0;
  }
}

export async function storeSendLike(sender: number, receiver: number) {
  try {
    await pool.query(
      'INSERT INTO thanks.message (sender_id, receiver_id) VALUES ($1, $2)',
      [sender, receiver]
    );
    await pool.query(
      'UPDATE thanks."user" SET likes=((SELECT likes FROM thanks."user" WHERE id=$1)+1) WHERE id=$1',
      [receiver]
    );
    await pool.query(
      'UPDATE thanks."user" SET likes_given=((SELECT likes_given FROM thanks."user" WHERE id=$1)+1) WHERE id=$1',
      [sender]
    );
  } catch (err) {
    console.log(err);
  }
}

export async function getUserID(
  chatID: number,
  firstName: string,
  lastName: string,
  userName: string
): Promise<number> {
  const userID = await getUserIDByChatId(chatID);
  if (userID) {
    return userID;
  }
  return createUser(chatID, firstName, lastName, userName);
}

export async function createUser(
  chatID: number,
  firstName: string,
  lastName: string,
  userName: string
): Promise<number> {
  try {
    const res = await pool.query(
      `INSERT INTO thanks.user (chat_id, telegram_tag, username)
                                  VALUES ($1, $2, $3) RETURNING id;`,
      [chatID, userName, `${firstName} ${lastName}`]
    );
    return res.rows[0].id;
  } catch {
    return 0;
  }
}

export async function getUserIDByChatId(
  chatID: number
): Promise<number | null> {
  try {
    const res = await pool.query(
      'SELECT id FROM thanks."user" WHERE chat_id=$1',
      [chatID]
    );
    if (res.rows.length === 0) {
      return null;
    }
    return res.rows[0].id;
  } catch {
    return null;
  }
}
interface ChatIdAndUserId {
  id: number;
  chat_id: number;
}

export async function getUserIDByTag(
  tag: string
): Promise<ChatIdAndUserId | null> {
  try {
    const res = await pool.query(
      'SELECT id, chat_id  FROM thanks."user" WHERE telegram_tag=$1',
      [tag]
    );
    if (res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0];
    return { id: row.id, chat_id: row.chat_id };
  } catch {
    return null;
  }
}

export async function getTopThanksGiver(): Promise<string[]> {
  try {
    const res = await pool.query(`WITH t1 AS (
                                      SELECT count(*) AS likes, sender_id
                                      FROM thanks.message
                                      WHERE created_at > now() - INTERVAL '10 DAY'
                                      GROUP BY sender_id)
                                  SELECT username
                                  FROM t1
                                          JOIN thanks."user" u ON u.id = t1.sender_id
                                  ORDER BY t1.likes DESC
                                  LIMIT 10;`);
    return res.rows.map(({ username }) => username);
  } catch (err) {
    console.log(err);
    return [];
  }
}

export async function getTopThanksReceiver(): Promise<string[]> {
  try {
    const res = await pool.query(`WITH t1 AS (
                                      SELECT count(*) AS likes, receiver_id
                                      FROM thanks.message
                                      WHERE created_at > now() - INTERVAL '10 DAY'
                                      GROUP BY receiver_id)
                                  SELECT username
                                  FROM t1
                                          JOIN thanks."user" u ON u.id = t1.receiver_id
                                  ORDER BY t1.likes DESC
                                  LIMIT 10;`);
    return res.rows.map(({ username }) => username);
  } catch (err) {
    console.log(err);
    return [];
  }
}

export async function getTopUser(): Promise<number[]> {
  try {
    const res = await pool.query(`WITH t1 AS (
                                    (SELECT count(*) AS likes, receiver_id
                                    FROM thanks.message
                                    WHERE created_at > now() - INTERVAL '10 DAY'
                                    GROUP BY receiver_id
                                    ORDER BY likes
                                    LIMIT 10)
                                    UNION
                                    (SELECT count(*) AS likes, sender_id
                                    FROM thanks.message
                                    WHERE created_at > now() - INTERVAL '10 DAY'
                                    GROUP BY sender_id
                                    ORDER BY likes
                                    LIMIT 10
                                    ))
                                SELECT u.chat_id
                                FROM t1
                                        JOIN thanks."user" u ON u.id = t1.receiver_id
                                ORDER BY t1.likes DESC
                                LIMIT 10;`);
    return res.rows.map(({ chat_id }) => chat_id);
  } catch (err) {
    console.log(err);
    return [];
  }
}
