var _ = module.exports = require('underscore');

var child_process = require('child_process');

_.path = require('path');
_.https = require('https');
_.request = require('request');
_.fs = require('fs');
_.os = require('os');
_.Q = require('q');
_.str = require('underscore.string');
_.config = require('../config');

_.mixin({
  defer: function() {
    return _.Q.defer();
  },
});