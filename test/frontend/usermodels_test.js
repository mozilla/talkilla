/* global chai, describe, it, app, beforeEach, afterEach, sinon */
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

  var userSet, sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    userSet = new app.models.UserSet();
  });

  afterEach(function() {
    sandbox.restore();
    userSet = null;
  });

  it("should be empty upon creation", function() {
    expect(userSet.length).to.equal(0);
  });

  describe("#initialize", function() {
    // XXX test that we're attaching _onPortMessage to the right spot
    it("should add a 'onmessage' handler to the socialPort");
  });

  // XXX where do i test for and implement detachment of the handler?

  // describe("#onPortMessage", function() {

  //   it("should replace the contents of this set with that of a 'user' message",
  //     function() {
  //       expect(userSet.length).to.equal(0);

  //       var arrayOfUsers = [{"nick": "larry"}, {"nick": "curly"}];
  //       var serverMsg = {'users': arrayOfUsers};
  //       userSet._onPortMessage({data: serverMsg});

  //       expect(userSet.toJSON()).to.deep.equal(arrayOfUsers);

  //       userSet._onPortMessage({data: {users: []}});
  //       expect(userSet.length).to.equal(0);
  //     });
  //   });

});
