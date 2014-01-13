/* global importScripts, SPAPort, Server, TalkillaSPA */
/* jshint unused:false */
"use strict";

importScripts('/vendor/backbone-events-standalone-0.1.5.js');
importScripts('/js/http.js');
importScripts('/spa/port.js', '/js/payloads.js', 'server.js', 'spa.js');

var port = new SPAPort();
var server = new Server();
var spa = new TalkillaSPA(port, server);
