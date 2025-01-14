drop table register_history;
CREATE TABLE register_history (
                        id serial primary key,
                        uid VARCHAR(255) NOT NULL,
                        name VARCHAR(255) NOT NULL,
--                         table_num integer,
                        registration_time TIMESTAMP ,
--                         award_game_id integer,
--                         award_time TIMESTAMP,
--                         getgift_time TIMESTAMP,
                        create_time TIMESTAMP default NOW()
);