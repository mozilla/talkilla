/* jshint unused:false, maxlen: 200 */

/**
 * The general event router.
 *
 * All the events that are passed by an app port (worker to subworker,
 * application to worker, etc.) sould be routed with this event router.
 */

var EventRouter = (function() {
  "use strict";

  var DEFAULT_ROUTES = [
    // Worker → SidebarApp
    {from: "Worker", topic: "social.user-profile", to: "SidebarApp"},
    {from: "Worker", topic: "talkilla.worker-ready", to: "SidebarApp"},
    {from: "Worker", topic: "talkilla.spa-connected", to: "SidebarApp"},
    {from: "Worker", topic: "talkilla.users", to: "SidebarApp", callable: "userListReceived"},
    {from: "Worker", topic: "talkilla.error", to: "SidebarApp"},
    {from: "Worker", topic: "talkilla.server-reconnection", to: "SidebarApp"},
    {from: "Worker", topic: "talkilla.reauth-needed", to: "SidebarApp"},

    // Worker → ChatApp
    {from: "Worker", topic: "talkilla.user-joined", to: "ChatApp"},
    {from: "Worker", topic: "talkilla.user-left", to: "ChatApp"},
    {from: "Worker", topic: "talkilla.move-accept", to: "ChatApp"},
  ];


  /**
   * Route the events to the appropriate context, using appPorts.
   *
   * @param  {String}  name     Name of the context. To be matched with the
   *                            ones in the from/to/via of the routes.
   * @param  {Object}  context  Object the router is routing for.
   * @param  {AppPort} appPort  AppPort to send and receive message from/to.
   * @param  {List}    routes   List of routes
   */
  function EventRouter(name, context, appPort, routes) {
    this.routes = routes || DEFAULT_ROUTES;
    this.name = name;
    this.appPort = appPort;
    this.context = context;

    // Starts to listen to the appPort.
    appPort.onmessage = function(topic, event) {
      event.topic = topic;
      this._onMessage(event);
    }.bind(this);
  }

  /**
   * Route a message to the appropriate context.
   *
   * @param {String}  topic   Topic of the event.
   * @param {Object}  data    The data to send trough.
   */
  EventRouter.prototype.send = function(topic, data) {
    // XXX Serialize data.
    var route = this._findRoute(topic);
    this.appPort.postMessage({
      "from": this.name,
      "to": route.to,
      "topic": topic,
      "callable": route.callable,
      "data": data
    });
  };

  EventRouter.prototype._onMessage = function(routeEvent){
    if (routeEvent.to === this.name) {
      // XXX Deserialize data.
      this.context[routeEvent.callable](routeEvent.data);
    } else if (routeEvent.via === this.name) {
      // Relay the message to the real destination in case we are a proxy.
      routeEvent.from = this.name;
      this.appPort.postMessage(routeEvent);
    }
  };

  EventRouter.prototype._findRoute = function(topic) {
    var route = this.routes.filter(function(route) {
      return route.topic === topic;
    }).shift();

    if (!route){
      throw "Event route not found for topic " + topic;
    }
    return route;
  };

  return EventRouter;
})();

