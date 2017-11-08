var express = require('express');
var app = express();
var pg = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mydb';


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
    const sl = 'SELECT * from person';
    
    pg.connect(connectionString, function(err, client, done) {
      client.query(sl, function(err, result) {
        done();
        if (err) { 
          console.error(err); res.send("Error " + err); 
        } else {
          callback({results: result.rows});
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
    findAllPeople((list)=>{
      res.render('pages/registration', list);
    });
  }
);

app.post('/registerSubmit', (req, res) => {
    var uid = req.body['uid'];
   
    if (!uid | uid == '') return;

    const sl = 'INSERT INTO person(uid) VALUES($1) RETURNING *'
    const vle = [uid];
    pg.connect(connectionString, function(err, client, done) {
      client.query(sl, vle, function(err, result) {
        done();
        if (err) { 
          console.error(err); res.send("Error " + err); 
        } else { 
	  findAllPeople((list)=>{
	    res.render('pages/registration', list);
	  });
        }
      });
    });
  }
);

//// game
app.get('/gameplay', (req, res) => {
    res.render('pages/gameplay');
  }
);

app.get('/execute', (req, res) => {
    res.render('pages/execute');
  }
);

app.get('/check', (req, res) => {
    res.render('pages/check');
  }
);
