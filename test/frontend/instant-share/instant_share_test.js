/* global sinon, Event, InstantShareApp, chai */

describe("InstantShareApp", function() {
  "use strict";

  var expect = chai.expect;
  var xhr, request;

  beforeEach(function() {
    xhr = sinon.useFakeXMLHttpRequest();

    request = undefined;
    xhr.onCreate = function (req) {
      request = req;
    };
  });

  afterEach(function() {
    xhr.restore();
  });

  // XXX test and implement a callback to handle errors from the post

  describe("click event on the call button", function() {

    it("should post an xhr request with an empty object to the " +
      "instant-share pingback API",
      function() {
        var instantShareApp = new InstantShareApp();
        instantShareApp.start();

        var event = new Event('click');
        document.querySelector("#instant-share-call a")
          .dispatchEvent(event);

        expect(request.method.toLowerCase()).to.equal("post");
        expect(request.async).to.equal(true);
        expect(request.url).to.equal(window.location);
        expect(request.requestBody).to.equal(JSON.stringify({}));
      });

  });

});
