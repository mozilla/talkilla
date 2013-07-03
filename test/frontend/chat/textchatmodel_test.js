/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, _, Backbone */

/* jshint expr:true */
var expect = chai.expect;

describe('Text chat models', function() {
  "use strict";

  var sandbox, media, peer, createTextChat;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    //sandbox.stub(window, "mozRTCPeerConnection");
    //sandbox.stub(app.models.WebRTCCall.prototype, "initialize");
    app.port = {
      on: sinon.spy(),
      postEvent: sinon.spy()
    };
    _.extend(app.port, Backbone.Events);

    media = new app.models.WebRTCCall(null, {dataChannel: true});
    peer = new app.models.User();

    createTextChat = function() {
      return new app.models.TextChat([], {media: media, peer: peer});
    };
  });

  afterEach(function() {
    sandbox.restore();
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

    describe("#ensureConnected", function() {
      it("should execute a callback when a pc is established", function() {
        var textChat = createTextChat();
        var called = sandbox.spy();
        media.connected = true;

        textChat.ensureConnected(called);

        sinon.assert.calledOnce(called);
      });

      it("should establish a pc when not connected, then execute a callback",
        function() {
          var textChat = createTextChat();
          var called = sandbox.spy();
          media.connected = false;

          textChat.ensureConnected(called);
          textChat.media.trigger("established");

          sinon.assert.calledOnce(called);
        });
    });

    describe("#send", function() {
      it("should add and send a message over data channel", function() {
        media.connected = true;
        var textChat = createTextChat();
        var entry = new app.models.TextChatEntry({
          nick: "niko",
          message: "hi"
        });

        textChat.send(entry);

        expect(textChat).to.have.length.of(1);
        expect(textChat.at(0).toJSON()).to.deep.equal(entry.toJSON());
      });

      it("should initiate a peer connection if not started yet", function() {
        media.connected = false;
        var textChat = createTextChat();
        sandbox.stub(media, "offer");

        textChat.send({nick: "niko", message: "hi"});

        sinon.assert.calledOnce(media.offer);
        sinon.assert.calledWith(media.offer, {video: false, audio: false});
      });

      it("should reuse a peer connection if already started", function() {
        media.connected = true;
        var textChat = createTextChat();
        sandbox.stub(media, "offer");

        textChat.send({nick: "niko", message: "hi"});

        sinon.assert.notCalled(media.offer);
      });
    });

  });

  describe('chatApp events for text chat', function () {
    var chatApp;

    beforeEach(function() {
      app.port = {postEvent: sinon.spy()};
      _.extend(app.port, Backbone.Events);
      sandbox.stub(ChatApp.prototype, "_onDataChannelMessageIn");
      chatApp = new ChatApp();
    });

    afterEach(function() {
      app.port.off();
    });

    it('should listen to the data channel `dc.in.message` event', function() {
      var event = {data: JSON.stringify({nick: "niko", message: "hi"})};

      chatApp.webrtc.trigger('dc.in.message', event);

      sinon.assert.calledOnce(chatApp._onDataChannelMessageIn);
      sinon.assert.calledWithExactly(chatApp._onDataChannelMessageIn, event);
    });
  });
});
