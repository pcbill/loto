const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mydb';
//const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/mydb';

exports.connectionString = connectionString;