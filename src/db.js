var _ = require('./util');

var dbLocation = _.path.join(_.config.db);

var sqlite = require('sqlite3');

var _db = new sqlite.Database(dbLocation);

var db = module.exports = {};

db.start = function() {
  var start = _.defer();
  _db.run("CREATE TABLE IF NOT EXISTS users ( name TEXT PRIMARY KEY, displayName TEXT, phoneNumber TEXT, timeCreated INTEGER, secret TEXT)", function(err) {
    if(err) return start.reject(err);
    _db.run("CREATE TABLE IF NOT EXISTS chats ( id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT, msg TEXT, timePosted INTEGER, sender TEXT, FOREIGN KEY(sender) REFERENCES users(name) )", function(err) {
      if(err) return start.reject(err);
      _db.run("CREATE UNIQUE INDEX IF NOT EXISTS phoneNumber ON users (phoneNumber)", function(err) {
        if(err) return start.reject(err);
        start.resolve();
      });
    });
  });
  return start.promise;
}

//if (!phoneNumber.match(/^\+\d{11,16}$/)) return fail

db.users = {};

db.users.list = function() {
  var list = _.defer();
  _db.all("SELECT * FROM users", function(err, items) {
    if(err) return list.reject(err);
    else return list.resolve(items);
  });
  return list.promise;
}

db.users.add = function(name, displayName, phoneNumber, secret) {
  var now = + new Date();
  var add = _.defer();
  _db.run("INSERT INTO users (name, displayName, phoneNumber, timeCreated, secret) VALUES (?, ?, ?, ?, ?)", {
    1: name,
    2: displayName,
    3: phoneNumber,
    4: now,
    5: secret
  }, function(err) {
    if(err) return add.reject(err);
    else return add.resolve({
      name: name,
      displayName: displayName,
      phoneNumber: phoneNumber,
      timeCreated: now,
      secret: secret
    });
  })
  return add.promise;
}

db.users.get = function(name) {
  var get = _.defer();
  _db.get("SELECT * FROM users WHERE name LIKE ?", {
    1: name
  }, function(err, item) {
    if(err) return get.reject(err);
    else return get.resolve(item);
  })
  return get.promise; 
}

db.users.getByPhoneNumber = function(number) {
  var get = _.defer();
  _db.get("SELECT * FROM users WHERE phoneNumber LIKE ?", {
    1: number
  }, function(err, item) {
    if(err) return get.reject(err);
    else return get.resolve(item);
  })
  return get.promise; 
}


db.users.delete = function(name) {
  var remove = _.defer();
  _db.run("DELETE FROM users WHERE name LIKE ?", {
    1: name
  }, function(err) {
    if(err) return remove.reject(err);
    else return remove.resolve();
  });
  return remove.promise;
}

db.chats = {};

db.chats.list = function(limit, before, after) {
  var list = _.defer();
  var order = 'DESC';
  var whereClause = '';
  var sqlData = { 1: limit };
  if (before) {
    whereClause = ' AND timePosted < ? ';
    sqlData = {
      1: before,
      2: limit
    };
  } else if (after) {
    whereClause = ' AND timePosted > ? ';
    sqlData = {
      1: after,
      2: limit
    };
  }
  _db.all("SELECT msg, status, sender, timePosted, displayName FROM chats, users WHERE chats.sender = users.name "+whereClause+" ORDER BY timePosted "+order+" LIMIT ?", sqlData, function(err, items) {
    if(err) return list.reject(err);
    else return list.resolve(items);
  });
  return list.promise;
}

db.chats.add = function(sender, msg) {
  var now = + new Date();
  var status = 'posted';
  var add = _.defer();
  _db.run("INSERT INTO chats (msg, status, sender, timePosted) VALUES (?, ?, ?, ?)", {
    1: msg,
    2: status,
    3: sender,
    4: now,
  }, function(err) {
    if(err) return add.reject(err);
    else return add.resolve({
      id: this.lastID,
      msg: msg,
      status: status,
      sender: sender,
      timePosted: now
    });
  })
  return add.promise;
}

db.chats.setStatus = function(id, status) {
  var set = _.defer();
  _db.run("UPDATE chats SET status = ? WHERE id LIKE ?", {
    1: status,
    3: id
  }, function(err) {
    if(err) return set.reject(err);
    else return set.resolve();
  });
  return set.promise;
}

db.chats.get = function(id) {
  var get = _.defer();
  _db.get("SELECT * FROM chats WHERE id LIKE ?", {
    1: id
  }, function(err, item) {
    if(err) return get.reject(err);
    else return get.resolve(item);
  })
  return get.promise; 
}
