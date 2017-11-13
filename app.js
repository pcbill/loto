var express = require('express');
var app = express();
var pg = require('pg');
var basicAuth = require('express-basic-auth');

var dateFormat = require('dateformat');

//const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mydb';
const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/mydb';

app.set('port', (process.env.PORT || 5000));

var basicAuth = basicAuth({
  users: {
      'admin': 'kdorkwj'
  },
  challenge: true
});

// regAuth = basicAuth({
//  users: {
//      'register': 'kdorkwj'
//  },
//  challenge: true
//});

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
          console.error(err); //res.send("Error " + err);
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
          console.error(err); //res.send("Error " + err);
        } else {
          callback();
        }
      });
    });
}

function findAllGames(callback) {
  findGame('all', callback);
}

function findGame(scope, callback) {
    var sl = 'SELECT * from game ';
    if (scope != 'all') {
        sl += ' AND gid = ' + scope;
    }

    pg.connect(connectionString, (err, client, done) => {
      client.query(sl, (err, result) => {
        done();
        if (err) {
          console.error(err); //res.send("Error " + err);
        } else {
          //result.rows.forEach((it)=>{
          //  it.registration_time = dateFormat(it.registration_time, 'yyyy/mm/dd hh:MM:ss');
          //});
          callback({results: result.rows});
        }
      });
    });
}

function deleteOneGame(id, callback) {
    const sl = 'DELETE from game WHERE id = $1';
    const v = [id]
    pg.connect(connectionString, function(err, client, done) {
      client.query(sl, v, function(err, result) {
        done();
        if (err) {
          console.error(err); //res.send("Error " + err);
        } else {
          callback();
        }
      });
    });
}

//// Route /////////////////////////////////

app.get('/', (req, res) => {
    findAllGames( (list) => {
      res.render('pages/index', list);
    });
  }
);

//// registration //////////////////////////
app.get('/registration', basicAuth, (req, res) => {
    findAllPeople( (list) => {
      res.render('pages/registration', list);
    });
  }
);

app.post('/registerSubmit', basicAuth, (req, res) => {
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
        console.error(err); //res.send("Error " + erv);
      } else {
        res.redirect('/registration');
      }
    });
  });
});

app.get('/manageRegistration', basicAuth, (req, res) => {
    findAllPeople( (list) => {
      res.render('pages/manageRegistration', list);
    });
  }
);

app.get('/deleteRegistration/:id', basicAuth, (req, res) => {
    var id = req.params.id;
    deleteOnePerson(id, ()=>{
        res.redirect('/manageRegistration');
    });
});

//// game //////////////////////////////////////
app.get('/gameplay', basicAuth, (req, res) => {
    findAllGames( (list) => {
      res.render('pages/gameplay', list);
    });
});

app.post('/createGame', basicAuth, (req, res) => {
  var gid = req.body['gid'];
  var award_list = req.body['award_list'];
  var participant_count = req.body['participant_count'];

  if (!gid | gid == '') {
    res.redirect('/gameplay');
    return;
  }

  //insert into game(gid, award_list, participant_count) values('1', '電視機,computer', '5');
  const sl = 'INSERT INTO game(gid, award_list, participant_count) VALUES($1, $2, $3) RETURNING *'
  const vle = [gid, award_list, participant_count];
  pg.connect(connectionString, function(err, client, done) {
    client.query(sl, vle, function(err, result) {
      done();
      if (err) {
        console.error(err); //res.send("Error " + err);
      } else {
        res.redirect('/gameplay');
      }
    });
  });
});

app.get('/deleteGame/:id', basicAuth, (req, res) => {
    var id = req.params.id;
    deleteOneGame(id, ()=>{
        res.redirect('/gameplay');
    });
});

app.get('/execute', basicAuth, (req, res) => {
    res.render('pages/execute');
});

app.get('/check', (req, res) => {
    res.render('pages/check');
});

app.get('/logout', (req, res) => {
  res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
  res.sendStatus(401);
});
