var express = require('express');
var app = express();
var pg = require('pg');
var basicAuth = require('express-basic-auth');

var dateFormat = require('dateformat');

var personDao = require('./lib/dao/personDao');
var gameDao = require('./lib/dao/gameDao');

var shuffle = require('./lib/random').shuffle;

const connectionString = require('./lib/dao/config').connectionString;

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


//// Route /////////////////////////////////

app.get('/', (req, res) => {
    gameDao.findAll( (list) => {
      res.render('pages/index', list);
    });
  }
);

//// registration //////////////////////////
app.get('/registration', basicAuth, (req, res) => {
    personDao.findAll( (list) => {
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

  personDao.register(uid, () => {
    res.redirect('/registration');
  });
});

app.get('/manageRegistration', basicAuth, (req, res) => {
    personDao.findAll( (list) => {
      res.render('pages/manageRegistration', list);
    });
  }
);

app.get('/deleteRegistration/:id', basicAuth, (req, res) => {
    var id = req.params.id;
    personDao.deleteOne(id, ()=>{
        res.redirect('/manageRegistration');
    });
});

//// game //////////////////////////////////////
app.get('/gameplay', basicAuth, (req, res) => {
    gameDao.findAll( (list) => {
      res.render('pages/gameplay', list);
    });
});

app.post('/createGame', basicAuth, (req, res) => {
  var gid = req.body['gid'];
  var award_list = req.body['award_list'];
  var participant_count = req.body['participant_count'];
  var type = req.body['type'];

  if (!gid | gid == '') {
    res.redirect('/gameplay');
    return;
  }

  gameDao.saveOne(gid, award_list, participant_count, type, () => {
    res.redirect('/gameplay');
  });
  
});

app.get('/deleteGame/:id', basicAuth, (req, res) => {
    var id = req.params.id;
    gameDao.deleteOne(id, ()=>{
        res.redirect('/gameplay');
    });
});

app.get('/execute', basicAuth, (req, res) => {
    personDao.findAll((re) => {
        var list = re.results;

        var uids = list.map((it) => { 
          return it.uid 
        });
        

        var re = uids;
        for (i = 0; i < 1000; i++) {
          //var re = uids.map((it) => {
          //  return it;
          //});
          shuffle(re);
          console.log(i+" "+re);
        }
    });
    res.render('pages/execute');
});

app.get('/check', (req, res) => {
    res.render('pages/check');
});

app.get('/logout', (req, res) => {
  res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
  res.sendStatus(401);
});
