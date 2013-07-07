/* global app, chai, describe, it, sinon, beforeEach, afterEach, _, Backbone */

/* jshint expr:true */
var expect = chai.expect;

describe('Text chat models', function() {
  "use strict";

  var sandbox, media, peer, createTextChat;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    // stubbing port
    app.port = {
      on: sinon.spy(),
      postEvent: sinon.spy()
    };
    _.extend(app.port, Backbone.Events);

    // stubbing WebRTCCall#send
    sandbox.stub(app.models.WebRTCCall.prototype, "send");

    // text chat model dependencies
    media = new app.models.WebRTCCall(null, {dataChannel: true});
    peer = new app.models.User();

    // object creation helper
    createTextChat = function() {
      return new app.models.TextChat([], {media: media, peer: peer});
    };
  });

  afterEach(function() {
    sandbox.restore();
    app.port.off();
  });

  describe("app.models.TextChatEntry", function() {
    it("should be initialized with defaults", function() {
      var entry = new app.models.TextChatEntry();

      expect(entry.get("nick")).to.be.a("undefined");
      expect(entry.get("message")).to.be.a("undefined");
      expect(entry.get("date")).to.be.a("number");
    });
  });

  describe("app.models.TextChat", function() {

    describe("constructor", function() {
      it("should accept a `media` option", function() {
        var textChat = createTextChat();

        expect(textChat.media).to.be.an.instanceOf(app.models.WebRTCCall);
      });

      it("should accept a `peer` option", function() {
        var textChat = createTextChat();

        expect(textChat.peer).to.be.an.instanceOf(app.models.User);
      });
    });

    describe("#send", function() {
      it("should add and send a message over data channel", function() {
        var textChat = createTextChat();
        var entry = {nick: "niko", message: "hi"};

        textChat.send(entry);

        sinon.assert.calledOnce(media.send);
        sinon.assert.calledWithMatch(media.send, entry);

        expect(textChat).to.have.length.of(1);
        expect(textChat.at(0).get("nick")).to.equal("niko");
        expect(textChat.at(0).get("message")).to.equal("hi");
      });

      it('should listen to the data channel `dc:message-in` event');
    });

    describe("events", function() {
      it('should listen to the data channel `dc.in.message` event', function() {
        var textChat = createTextChat();
        sandbox.stub(textChat, "add");
        var event = {data: JSON.stringify({nick: "niko", message: "hi"})};

        textChat.media.trigger('dc.in.message', event);

        sinon.assert.calledOnce(textChat.add);
        sinon.assert.calledWithExactly(textChat.add,
                                       {nick: "niko", message: "hi"});
      });
    });

  });

});
