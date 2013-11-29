/* global importScripts, SPAPort, Server, TalkillaSPA */
/* jshint unused:false */
"use strict";

importScripts('../../vendor/backbone-events-standalone-0.1.5.js');
importScripts('/js/http.js');
importScripts('port.js', '../payloads.js', 'server.js', 'talkilla_spa.js');

var port = new SPAPort();
var server = new Server();
var spa = new TalkillaSPA(port, server);
