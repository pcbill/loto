create table person
(
    id                integer   default nextval('person_backup_id_seq'::regclass) not null
        constraint person_backup_pkey
            primary key,
    uid               varchar(255)                                                not null,
    name              varchar(255)                                                not null,
    table_num         integer,
    registration_time timestamp,
    award_game_id     integer,
    award_time        timestamp,
    getgift_time      timestamp,
    create_time       timestamp default now()
);

alter table person
    owner to npust;

