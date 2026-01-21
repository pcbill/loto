create table public.registration_history
(
    id          serial
        primary key,
    uid         varchar(255) not null,
    name        varchar(255) not null,
    create_time timestamp default now()
);

alter table public.registration_history
    owner to npust;

