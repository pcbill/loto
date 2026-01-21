create table public.game
(
    id                serial
        primary key,
    gid               varchar(255)  not null,
    award_list        varchar(1024) not null,
    participant_count integer,
    reminder_count    integer,
    exec_type         integer   default 0,
    ordered           integer,
    played_time       timestamp,
    create_time       timestamp default now(),
    drawing_status    integer   default 0
);

alter table public.game
    owner to npust;