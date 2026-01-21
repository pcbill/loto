// 資料庫連線設定
var connectionString;
var sslConfig;

if (process.env.DATABASE_URL) {
    connectionString = process.env.DATABASE_URL;
    
    // 檢查是否需要 SSL
    var useSSL = process.env.DATABASE_SSL !== 'false';
    if (useSSL) {
        // Render 等雲端資料庫需要這個設定
        sslConfig = { rejectUnauthorized: false };
    } else {
        sslConfig = false;
    }
} else {
    // 預設本地開發用
    connectionString = 'postgres://postgres:postgres@localhost:5432/loto';
    sslConfig = false;
}

console.log('Database URL:', connectionString.replace(/:[^:@]+@/, ':****@'));
console.log('Database SSL:', sslConfig !== false);

exports.connectionString = connectionString;
exports.sslConfig = sslConfig;
