var express = require('express');

var _ = require('./util');
var app = express();

var config = require('../config');

var db = require('./db');

app.configure(function(){
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.cookieParser());
});

var theValue = 'dude';

app.get(function(req, res) {
  res.send(theValue);
});

app.post(function(req, res) {
  theValue = JSON.stringify(req.body);
  res.send();
});

app.listen(config.port, function(err) {

  if(err) return console.log('Error! ', err);

  console.log('Server started on '+config.port);

});