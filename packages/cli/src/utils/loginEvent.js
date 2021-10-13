/**
 * Sharing an emitter between the login and login-ci commands
 */
var events = require('events');
module.exports =  new events.EventEmitter();
