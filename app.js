var express = require('express');
var app = express();
var pg = require('pg');

var dateFormat = require('dateformat');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mydb';
//const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/mydb';


app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});

var bodyParser = require('body-parser');
app.use(bodyParser.json());
//app.use(bodyParser.urlencoded());
// in latest body-parser use like below.
app.use(bodyParser.urlencoded({ extended: true }));

//// helper functions

function findAllPeople(callback) {
  findPeople('all', callback);
}

function findPeople(scope, callback) {
    var sl = 'SELECT * from person where registration_time is not null';
    if (scope != 'all') {
        sl += ' AND uid = ' + scope;
    }

    pg.connect(connectionString, (err, client, done) => {
      client.query(sl, (err, result) => {
        done();
        if (err) { 
          console.error(err); res.send("Error " + err); 
        } else {
          result.rows.forEach((it)=>{
            it.registration_time = dateFormat(it.registration_time, 'yyyy/mm/dd hh:MM:ss');
          });
          callback({results: result.rows});
        }
      });
    });
}


function deleteOnePerson(id, callback) {
    //const sl = 'DELETE from person WHERE id = $1';
    const sl = 'UPDATE person SET registration_time = null WHERE id = $1';
    const v = [id]
    pg.connect(connectionString, function(err, client, done) {
      client.query(sl, v, function(err, result) {
        done();
        if (err) { 
          console.error(err); res.send("Error " + err); 
        } else {
          callback();
        }
      });
    });
}
//// Route

app.get('/', (req, res) => {
    res.render('pages/index');
  }
);

//// registration
app.get('/registration', (req, res) => {
    findAllPeople( (list) => {
      res.render('pages/registration', list);
    });
  }
);

app.post('/registerSubmit', (req, res) => {
  var uid = req.body['uid'];
   
  if (!uid | uid == '') {
    res.redirect('/registration');
    return;
  }  

  //const sl = 'INSERT INTO person(uid) VALUES($1) RETURNING *'
  const sl = 'UPDATE person SET registration_time = NOW() WHERE uid = $1';
  const vle = [uid];
  pg.connect(connectionString, function(err, client, done) {
    client.query(sl, vle, function(err, result) {
      done();
      if (err) { 
        console.error(err); res.send("Error " + err); 
      } else { 
        res.redirect('/registration');
      }
    });
  });
});

app.get('/deleteRegistration/:id', (req, res) => {
    var id = req.params.id;
    deleteOnePerson(id, ()=>{
        res.redirect('/registration');
    });
});

//// game
app.get('/gameplay', (req, res) => {
    res.render('pages/gameplay');
});

app.get('/execute', (req, res) => {
    res.render('pages/execute');
});

app.get('/check', (req, res) => {
    res.render('pages/check');
});
