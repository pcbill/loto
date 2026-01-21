create table public.person
(
    id                serial
        primary key,
    uid               varchar(255) not null,
    name              varchar(255) not null,
    table_num         integer,
    registration_time timestamp,
    award_game_id     integer,
    award_time        timestamp,
    getgift_time      timestamp,
    create_time       timestamp default now(),
    replay_count      integer   default 0
);

alter table public.person
    owner to npust;

