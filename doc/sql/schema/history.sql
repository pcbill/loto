create table history
(
    id          integer   default nextval('history_backup_id_seq'::regclass)      not null
        constraint history_backup_pkey
            primary key,
    game_id     integer   default nextval('history_backup_game_id_seq'::regclass) not null,
    result      varchar(2550)                                                     not null,
    create_time timestamp default now()
);

alter table history
    owner to npust;