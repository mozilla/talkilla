/* globals sinon, SPAChannel, expect */

"use strict";

describe("SPAChannel", function() {
  var appPort, spaChannel;

  beforeEach(function() {
    appPort = _.extend({post: sinon.spy()}, Backbone.Events);
    spaChannel = new SPAChannel(appPort, "some peer");
  });

  describe("#send", function() {

    it("should post a message to the AppPort", function() {
      spaChannel.send({some: "data"});

      sinon.assert.calledOnce(appPort.post);
      sinon.assert.calledWithExactly(
        appPort.post, "talkilla.spa-channel-message", {
          some: "data",
          peer: "some peer"
        });
    });

  });

  describe("events", function() {

    describe("message", function() {

      it("should trigger a message event when receiving a" +
        "talkilla.spa-channel-message event", function(done) {
          spaChannel.on("message", function(data) {
            expect(data).to.deep.equal({some: "data"});
            done();
          });

          appPort.trigger("talkilla.spa-channel-message", {some: "data"});
        });

    });

  });
});
