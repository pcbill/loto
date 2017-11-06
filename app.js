var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});

//// Route

app.get('/', (req, res) => {
    res.render('pages/index');
  }
);

app.get('/registration', (req, res) => {
    res.render('pages/registration');
  }
);

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