/* global sinon, Event */

"use strict";

describe("Instant-share webpage", function() {
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

  describe("call button", function() {

    it("should post an xhr request to the instant-share ping back API",
      function() {
        var event = new Event('click');
        document.querySelector("#instant-share-call a")
          .dispatchEvent(event);

        sinon.assert.calledOnce(xhr.open);
        sinon.assert.calledWithExactly(xhr.open, "POST", window.location, true);
      });

  });

});
