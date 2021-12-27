CREATE SCHEMA thanks;

CREATE TABLE thanks."user"
(
    id           SERIAL PRIMARY KEY,
    chat_id      int UNIQUE         NOT NULL,
    telegram_tag varchar(35) UNIQUE NOT NULL,
    username     varchar(70)        NOT NULL,
    likes        int                NOT NULL DEFAULT 0,
    likes_given  int                NOT NULL DEFAULT 0
);

CREATE TABLE thanks.user_role
(
    user_id int,
    role_id int,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE thanks.role
(
    id   SERIAL PRIMARY KEY,
    name varchar(30) UNIQUE NOT NULL
);

CREATE TABLE thanks.message
(
    id          SERIAL PRIMARY KEY,
    sender_id   int       NOT NULL,
    receiver_id int       NOT NULL,
    content     varchar(3268),
    created_at  timestamp NOT NULL DEFAULT NOW(),
    is_sent     bool      NOT NULL DEFAULT true
);

ALTER TABLE thanks.user_role
    ADD FOREIGN KEY (user_id) REFERENCES thanks."user" (id);

ALTER TABLE thanks.user_role
    ADD FOREIGN KEY (role_id) REFERENCES thanks.role (id);

ALTER TABLE thanks.message
    ADD FOREIGN KEY (sender_id) REFERENCES thanks."user" (id);

ALTER TABLE thanks.message
    ADD FOREIGN KEY (receiver_id) REFERENCES thanks."user" (id);
