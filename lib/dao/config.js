const connectionString = process.env.DATABASE_URL + '?ssl=true' || 'postgres://postgres:postgres@localhost:5432/mydb';

exports.connectionString = connectionString;
