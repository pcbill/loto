const XLSX = require('xlsx');
const path = require('path');

// ===== 獎項資料 (from game_test_init.sql) =====
const gameData = [
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

// ===== 人員資料 (from person_test_init.sql) =====
const personData = [
    { uid: '0817302981', name: '陳X祥', table_num: 18 },
    { uid: '0817087189', name: '吳X霖', table_num: 78 },
    { uid: '0817170069', name: '盧X昌', table_num: 40 },
    { uid: '0817595637', name: '黃X熙', table_num: 74 },
    { uid: '0817106325', name: '謝X全', table_num: 14 },
    { uid: '0817271285', name: '顏X博', table_num: 5 },
    { uid: '0817102981', name: '葉X清', table_num: 49 },
    { uid: '0817278549', name: '曾X友', table_num: 71 },
    { uid: '0817258133', name: '林X陽', table_num: 36 },
    { uid: '0817592533', name: '邱X璇', table_num: 62 },
    { uid: '0817550741', name: '鄭X桂', table_num: 65 },
    { uid: '0817576085', name: '蔡X娟', table_num: 76 },
    { uid: '0817083765', name: '曾X淑', table_num: 37 },
    { uid: '0817596229', name: '郭X健', table_num: 10 },
    { uid: '1817302981', name: '陳X', table_num: 18 },
    { uid: '1817087189', name: '吳X', table_num: 78 },
    { uid: '1817170069', name: '盧X', table_num: 40 },
    { uid: '1817595637', name: '黃X', table_num: 74 },
    { uid: '1817106325', name: '謝X', table_num: 14 },
    { uid: '1817271285', name: '顏X', table_num: 5 },
    { uid: '1817102981', name: '葉X', table_num: 49 },
    { uid: '1817278549', name: '曾X', table_num: 71 },
    { uid: '1817258133', name: '林X', table_num: 36 },
    { uid: '1817592533', name: '邱X', table_num: 62 },
    { uid: '1817550741', name: '鄭X', table_num: 65 },
    { uid: '1817576085', name: '蔡X', table_num: 76 },
    { uid: '1817083765', name: '曾X', table_num: 37 },
    { uid: '1817596229', name: '郭X', table_num: 10 },
    { uid: '2817302981', name: '陳祥', table_num: 18 },
    { uid: '2817087189', name: '吳霖', table_num: 78 },
    { uid: '2817170069', name: '盧昌', table_num: 40 },
    { uid: '2817595637', name: '黃熙', table_num: 74 },
    { uid: '2817106325', name: '謝全', table_num: 14 },
    { uid: '2817271285', name: '顏博', table_num: 5 },
    { uid: '2817102981', name: '葉清', table_num: 49 },
    { uid: '2817278549', name: '曾友', table_num: 71 },
    { uid: '2817258133', name: '林陽', table_num: 36 },
    { uid: '2817592533', name: '邱璇', table_num: 62 },
    { uid: '2817550741', name: '鄭桂', table_num: 65 },
    { uid: '2817576085', name: '蔡娟', table_num: 76 },
    { uid: '2817083765', name: '曾淑', table_num: 37 },
    { uid: '2817596229', name: '郭健', table_num: 10 },
    { uid: '3817302981', name: '陳祥O', table_num: 18 },
    { uid: '3817087189', name: '吳霖O', table_num: 78 },
    { uid: '3817170069', name: '盧昌O', table_num: 40 },
    { uid: '3817595637', name: '黃熙O', table_num: 74 },
    { uid: '3817106325', name: '謝全O', table_num: 14 },
    { uid: '3817271285', name: '顏博O', table_num: 5 },
    { uid: '3817102981', name: '葉清O', table_num: 49 },
    { uid: '3817278549', name: '曾友O', table_num: 71 },
    { uid: '3817258133', name: '林陽O', table_num: 36 },
    { uid: '3817592533', name: '邱璇O', table_num: 62 },
    { uid: '3817550741', name: '鄭桂O', table_num: 65 },
    { uid: '3817576085', name: '蔡娟O', table_num: 76 },
    { uid: '3817083765', name: '曾淑O', table_num: 37 },
    { uid: '3817596229', name: '郭健O', table_num: 10 }
];

// 生成獎項 Excel
const gameWs = XLSX.utils.json_to_sheet(gameData);
gameWs['!cols'] = [
    { wch: 10 },  // gid
    { wch: 40 },  // award_list
    { wch: 18 },  // participant_count
    { wch: 15 },  // reminder_count
    { wch: 10 }   // exec_type
];
const gameWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(gameWb, gameWs, 'games');
const gamePath = path.join(__dirname, '..', 'public', 'templates', 'game_template.xlsx');
XLSX.writeFile(gameWb, gamePath);
console.log('✅ 獎項範本已生成:', gamePath);

// 生成人員 Excel
const personWs = XLSX.utils.json_to_sheet(personData);
personWs['!cols'] = [
    { wch: 15 },  // uid
    { wch: 12 },  // name
    { wch: 10 }   // table_num
];
const personWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(personWb, personWs, 'persons');
const personPath = path.join(__dirname, '..', 'public', 'templates', 'person_template.xlsx');
XLSX.writeFile(personWb, personPath);
console.log('✅ 人員範本已生成:', personPath);

console.log('\n📊 統計:');
console.log('   獎項數量:', gameData.length);
console.log('   人員數量:', personData.length);
