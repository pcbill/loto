-- 新增開獎狀態欄位到 game 表
-- 執行時間: 2026-01-21
-- 用途: 防止開獎動畫播放中，其他視窗提早看到開獎結果

-- 新增欄位
ALTER TABLE game ADD COLUMN IF NOT EXISTS drawing_status integer default 0;

-- 欄位說明:
-- drawing_status: 開獎狀態
--   0 = 未開獎 (NOT_STARTED)
--   1 = 開獎中 (IN_PROGRESS) 
--   2 = 已完成 (COMPLETED)

-- 將現有已開獎的遊戲設為已完成狀態
UPDATE game SET drawing_status = 2 WHERE played_time IS NOT NULL;

-- 驗證
SELECT id, gid, award_list, drawing_status, played_time FROM game ORDER BY id;
