const XLSX = require('xlsx');
const path = require('path');

// 根據 game_test_init.sql 的資料
const data = [
    { gid: 'A15', award_list: 'A15全聯禮券', participant_count: 10, reminder_count: 10, exec_type: 0 },
    { gid: 'A12', award_list: 'A12aiwa1.8L三層防燙保溫電茶壺', participant_count: 3, reminder_count: 3, exec_type: 0 },
    { gid: 'A11', award_list: 'A11Oster Ball果汁機', participant_count: 3, reminder_count: 3, exec_type: 0 },
    { gid: 'B13', award_list: 'B13主任禮券紅包', participant_count: 1, reminder_count: 1, exec_type: 0 },
    { gid: 'B14', award_list: 'B14主任現金紅包', participant_count: 2, reminder_count: 2, exec_type: 1 },
    { gid: 'B15', award_list: 'B15館長現金紅包', participant_count: 1, reminder_count: 1, exec_type: 0 },
    { gid: 'B16', award_list: 'B16處長現金紅包', participant_count: 1, reminder_count: 1, exec_type: 1 },
    { gid: 'B17', award_list: 'B17處長禮券紅包', participant_count: 1, reminder_count: 1, exec_type: 0 },
    { gid: 'B12', award_list: 'B12國際長現金紅包', participant_count: 1, reminder_count: 1, exec_type: 0 },
    { gid: 'B25', award_list: 'B25人文學院院長現金紅包', participant_count: 1, reminder_count: 1, exec_type: 0 },
    { gid: 'B11', award_list: 'B11研發長現金紅包', participant_count: 1, reminder_count: 1, exec_type: 0 },
    { gid: 'A9', award_list: 'A9aiwa黑晶電陶爐', participant_count: 2, reminder_count: 2, exec_type: 0 },
    { gid: 'A10', award_list: 'A10THOMSON多功能雙電壓美食鍋', participant_count: 3, reminder_count: 3, exec_type: 0 },
    { gid: 'B7', award_list: 'B7主任秘書現金紅包', participant_count: 1, reminder_count: 1, exec_type: 0 },
    { gid: 'B8', award_list: 'B8教務長現金紅包', participant_count: 1, reminder_count: 1, exec_type: 0 },
    { gid: 'B9', award_list: 'B9學務長現金紅包', participant_count: 1, reminder_count: 1, exec_type: 0 }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'games');

// 設定欄寬
ws['!cols'] = [
    { wch: 10 },  // gid
    { wch: 40 },  // award_list
    { wch: 18 },  // participant_count
    { wch: 15 },  // reminder_count
    { wch: 10 }   // exec_type
];

const outputPath = path.join(__dirname, '..', 'public', 'templates', 'game_template.xlsx');
XLSX.writeFile(wb, outputPath);
console.log('game_template.xlsx 已生成於:', outputPath);
