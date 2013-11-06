var express = require('express');

var _ = require('./util');

var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

var clientDir = __dirname + '/../client';
var indexFile = clientDir + '/index.html';

app.use('/client', express.static(clientDir));
app.use('/client/lib', express.static(__dirname + '/../bower_components'));

var db = require('./db');

var twilio = require('twilio');
var phoneClient = new twilio.RestClient(_.config.twilio.account_sid, _.config.twilio.auth_token);

function sendSms(chat, user) {
  var send = _.defer();
  phoneClient.sendMessage({
    to: user.phoneNumber,
    from: '+16506469713', 
    body: chat.msg
  }).then(function(response) {
    delete response.nodeClientResponse;
    send.resolve(response);
  }, send.reject);
  return send.promise;
}

function postChat(user, msg) {
  var post = _.defer();
  db.chats.add(user.name, msg).then(function(chat) {
    sendMessage(chat).then(function() {
      post.resolve(chat);
    }, post.reject);
  }, post.reject);
  return post.promise;
}

function sendMessage(chat) {
  var send = _.defer();
  db.users.list().then(function(users) {
    users = _.filter(users, function(u) {
      return u.name != chat.sender;
    });
    send.resolve(_.Q.all(_.map(users, function(user) {
      return deliverMessage(chat, user);
    })));
  }, function(err) {
    send.reject(err);
  });
  return send.promise;
}

function deliverMessage(chat, user) {
  chat.displayName = user.displayName;
  var deliver = _.defer();
  var socket = userSockets[user.name]
  if(socket) {
    var hasRecieved = false;
    socket.emit('chat', chat);
    socket.on('chat/recieved/' + chat.id, function(data) {
      if (data.read) hasRecieved = true;
      deliver.resolve(chat);
    });
    setTimeout(function() {
      if(!hasRecieved) deliver.resolve(sendSms(chat, user));
    }, 2000);
  } else {
    deliver.resolve(sendSms(chat, user));
  }
  return deliver.promise;
}


function sendInitialChats(socket) {
  db.chats.list().then(function(chats) {
    socket.emit('chats', chats.reverse());
  }, function(err) {
    console.log('cant get chats !', err);
  });
}

var userSockets = {};

io.sockets.on('connection', function (socket) {
  var user;
  socket.on('signup', function (data) {
    console.log('signup', data);
    db.users.add(data.name, data.displayName, data.phoneNumber, data.secret).then(function(user) {
      socket.emit('auth/success', user);
      sendInitialChats(socket);
    }, function(err) {
      return socket.emit('auth/error', { msg: 'Invalid User' });
    });
  });
  socket.on('login', function (data) {
    db.users.get(data.name).then(function(u) {
      if(!u || u.secret != data.secret) return socket.emit('auth/error', { msg: 'Invalid Login' });
      user = u;
      userSockets[user.name] = socket;
      socket.emit('auth/success', user);
      sendInitialChats(socket);
    }, function(err) {
      return socket.emit('auth/error', { msg: 'Invalid Login' });
    });
  });
  socket.on('chat', function (data) {
    if(!user) return socket.emit('chat/error', { msg: 'Invalid Authentication' });
    postChat(user, data.msg).then(function(chat) {
      chat.displayName = user.displayName;
      socket.emit('chat/success', chat);
    }, function(err) {
      socket.emit('chat/error', { msg: err });
    });
  });
  socket.on('disconnect', function () {
    if(user) {
      delete userSockets[user.name];
    }
  });
});


app.configure(function(){
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.cookieParser());
});

app.get('/', function(req, res) {
  _.fs.readFile(indexFile, {encoding: 'utf8'}, function(err, file) {
    if (err) return res.send(500, err);
    res.send(file);
  });
});

app.get('/users', function(req, res) {
  db.users.list().then(function(users) {
    res.send(users);
  }, function(err) {
    res.send(500, err);
  });
});

app.post('/users', function(req, res) {
  var name = req.body.name;
  var displayName = req.body.displayName;
  var phoneNumber = req.body.phoneNumber;
  var secret = req.body.secret;
  db.users.add(name, displayName, phoneNumber, secret).then(function() {
    res.send(200);
  }, function(err) {
    res.send(500, err);
  });
});

app.post('/hooks/message', function(req, res) {
  var from = req.body.From;
  var msg = req.body.Body;
  db.users.getByPhoneNumber(from).then(function(user) {
    postChat(user, msg).then(function(c) {
      console.log('chat #'+c.id+' posted');
    }, function(err) {
      console.log('error posting chat:',err);
    });
  }, function(err){
    console.log('could not find user with phone number: '+from);
  });
});

db.start().then(function(){

  console.log('DB');

  server.listen(_.config.port, function(err) {

    if(err) return console.log('Error! ', err);

    console.log('Server started on '+_.config.port);

  });

}, function(err) {
  console.log('Error starting DB: ', err);
});