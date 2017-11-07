var express = require('express');
var app = express();
var pg = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/mydb';


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



//// Route

app.get('/', (req, res) => {
    res.render('pages/index');
  }
);

//// registration
app.get('/registration', (req, res) => {
    res.render('pages/registration');
  }
);

app.post('/registerSubmit', (req, res) => {
    console.log(req.body['uid']);

    //const sl = 'SELECT * FROM person';
    const sl = 'INSERT INTO person(name) VALUES($1) RETURNING *'
    const vle = [req.body['uid']];
    pg.connect(connectionString, function(err, client, done) {
      client.query(sl, vle, function(err, result) {
        done();
        if (err) { 
          console.error(err); res.send("Error " + err); 
        } else { 
          res.render('pages/registration');
 //         res.render('pages/db', {results: result.rows} ); 
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