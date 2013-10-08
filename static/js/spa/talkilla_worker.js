/* global importScripts, SPAPort, Server, TalkillaSPA */
/* jshint unused:false */

importScripts('../../vendor/backbone-events-standalone-0.1.5.js');
importScripts('../worker/http.js');
importScripts('port.js', 'server.js', 'talkilla_spa.js');

var port = new SPAPort();
var server = new Server();
var spa = new TalkillaSPA(port, server);

