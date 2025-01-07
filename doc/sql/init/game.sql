drop table game;
CREATE TABLE game (
                      id serial primary key,
                      gid VARCHAR(255) NOT NULL,
                      award_list VARCHAR(1024) NOT NULL,
                      participant_count integer,
                      reminder_count integer,
                      exec_type integer default 0,               -- 0:normal, 1:drama
                      ordered integer,
                      played_time TIMESTAMP,
                      create_time TIMESTAMP default NOW()
);