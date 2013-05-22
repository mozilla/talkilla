/* global chai, describe, it, app, Port, PortCollection*/
var expect = chai.expect;

describe("app.models.User", function() {
  "use strict";

  it("should be initialized with a sensible defaults object",
    function() {
      var user = new app.models.User();
      expect(user.defaults).to.deep.equal({nick: undefined});
    });

});

describe("app.models.UserSet", function() {
  "use strict";

  it("should be empty upon creation",
    function() {
      var userSet = new app.models.UserSet();
      expect(userSet.length).to.equal(0);
    });

  it("should listen for a 'users' message and replace its content said info",
    function() {
      var arrayOfUsers = [{"nick": "larry"}, {"nick": "curly"}];
      var userSet = new app.models.UserSet();
      var ports = new PortCollection();
      ports.add(new Port({_portid: 21, postMessage: function() {}}));

      ports.broadcastEvent('users', arrayOfUsers);

      expect(userSet.length).to.equal(2);
      expect(userSet.toJSON()).to.equal(arrayOfUsers);

      // expect the message to have been received
    });

});
