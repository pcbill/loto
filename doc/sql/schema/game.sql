drop table game;
CREATE TABLE game (
                      id serial primary key,
                      gid VARCHAR(255) NOT NULL,
                      award_list VARCHAR(1024) NOT NULL,
                      participant_count integer,
                      reminder_count integer,
                      exec_type integer default 0,               -- 0:normal, 1:drama
                      drawing_status integer default 0,          -- 0:未開獎, 1:開獎中, 2:已完成
                      ordered integer,
                      played_time TIMESTAMP,
                      create_time TIMESTAMP default NOW()
);

-- 若要在現有資料庫新增欄位：
-- ALTER TABLE game ADD COLUMN drawing_status integer default 0;