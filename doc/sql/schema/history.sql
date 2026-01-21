create table public.history
(
    id          integer   default nextval('history_backup_id_seq'::regclass)      not null
        constraint history_backup_pkey
            primary key,
    game_id     integer   default nextval('history_backup_game_id_seq'::regclass) not null,
    result      text                                                              not null,
    create_time timestamp default now()
);

alter table public.history
    owner to npust;

