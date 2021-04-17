//const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mydb';
const connectionString = process.env.DATABASE_URL + '?ssl=true' || 'jdbc:postgresql://ec2-54-205-183-19.compute-1.amazonaws.com:5432/d5kf7oqebungl2';

exports.connectionString = connectionString;
