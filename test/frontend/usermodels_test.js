/* global chai, describe, it, app, beforeEach, afterEach, sinon,
   initMozSocial */
var expect = chai.expect;

describe("app.models.User", function() {
  "use strict";

  it("should be initialized with a sensible defaults object", function() {
    var user = new app.models.User();
    expect(user.defaults).to.deep.equal({nick: undefined});
  });

});

describe("app.models.UserSet", function() {
  "use strict";

  var sandbox, port;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    // XXX: please fasten your seatbelt (we're sorry)
    app.services._portListener = undefined;
    port = {};

    navigator.mozSocial = {
      getWorker: function() {
        return {
          port: port
        };
      }
    };
  });

  afterEach(function() {
    sandbox.restore();
  });

  it("should be empty upon creation", function() {
    var userSet = new app.models.UserSet();
    expect(userSet.length).to.equal(0);
  });

  it("should update the user collection according to `talkilla.users` events",
    function() {
      var userSet = new app.models.UserSet();
      expect(navigator.mozSocial.getWorker().port).to.deep.equal(port);
      expect(port.onmessage).to.be.a("function");
      port.onmessage({
        topic: "talkilla.users",
        data: [{nick: "bob"}]
      });
      expect(userSet).have.length.of(1);
      expect(userSet.at(0).get('nick')).to.equal("bob");
      port.onmessage({
        topic: "talkilla.users",
        data: [{nick: "bob"}, {nick: "bill"}]
      });
      expect(userSet).have.length.of(2);
      expect(userSet.at(0).get('nick')).to.equal("bob");
      expect(userSet.at(1).get('nick')).to.equal("bill");
    });
});
