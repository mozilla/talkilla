/* global sinon, Event, InstantShareApp */

describe("InstantShareApp", function() {
  "use strict";

  var sandbox, xhr;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    xhr = {
      open: sinon.spy(),
      setRequestHeader: function() {},
      send: function() {}
    };
    sandbox.stub(window, "XMLHttpRequest").returns(xhr);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("click event on the call button", function() {

    it("should post an xhr request to the instant-share ping back API",
      function() {
        var instantShareApp = new InstantShareApp();
        instantShareApp.start();

        var event = new Event('click');
        document.querySelector("#instant-share-call a")
          .dispatchEvent(event);

        sinon.assert.calledOnce(xhr.open);
        sinon.assert.calledWithExactly(xhr.open, "POST", window.location, true);
      });

  });

});
