var express = require('express');
var app = express();
var pg = require('pg');

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


const connectionString = process.env.DATABASE_URL || 'postgres://localhost:5432/mydb';

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

    pg.connect(connectionString, function(err, client, done) {
        client.query('SELECT * FROM person', function(err, result) {
          done();
          if (err)
           { console.error(err); response.send("Error " + err); }
          else
           { response.render('pages/db', {results: result.rows} ); }
        });
      });


    res.render('pages/registration');
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