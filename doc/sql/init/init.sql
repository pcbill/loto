create database mydb;

drop table history;
CREATE TABLE history (
                         id serial primary key,
                         game_id serial NOT NULL,
                         result VARCHAR(2550) NOT NULL,
                         create_time TIMESTAMP default NOW()
);