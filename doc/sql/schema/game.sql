create table game
(
    id                integer   default nextval('game_backup_id_seq'::regclass) not null
        constraint game_backup_pkey
            primary key,
    gid               varchar(255)                                              not null,
    award_list        varchar(1024)                                             not null,
    participant_count integer,
    reminder_count    integer,
    exec_type         integer   default 0,
    ordered           integer,
    played_time       timestamp,
    create_time       timestamp default now()
);

alter table game
    owner to npust;