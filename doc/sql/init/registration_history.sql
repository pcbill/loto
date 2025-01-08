drop table registration_history;
CREATE TABLE registration_history (
                        id serial primary key,
                        uid VARCHAR(255) NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        create_time TIMESTAMP default NOW()
);
