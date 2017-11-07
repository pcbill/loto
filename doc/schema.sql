     
     sudo -u postgres psql

     postgres=> alter user postgres password 'apassword';
     postgres=> create user yerusername createdb createuser password 
'somepass';
     postgres=> create database yerusername owner yerusername;
     postgres=> \q


var conString = "postgresql://username:password@lacalhost/postgres";

schema
======

create database mydb;

 CREATE TABLE person (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL
        );
