/*global chai */

var expect = chai.expect;

describe("CallView", function() {
  "use strict";

  var fakeLocalStream = "fakeLocalStream";
  var fakeRemoteStream = "fakeRemoteStream";
  var el = 'fakeDom';
  var sandbox, media, call;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    // XXX This should probably be a mock, but sinon mocks don't seem to want
    // to work with Backbone.
    media = {
      answer: sandbox.spy(),
      establish: sandbox.spy(),
      initiate: sandbox.spy(),
      terminate: sandbox.spy(),
      on: sandbox.stub()
    };
    call = new app.models.Call({}, {media: media});
  });

  afterEach(function() {
    sandbox.restore();
    media = null;
    call = null;
    $("#fixtures").empty();
  });

});
