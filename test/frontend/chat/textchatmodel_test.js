/* global app, chai, describe, it, sinon, beforeEach, afterEach, _, Backbone,
   WebRTC */

/* jshint expr:true */
var expect = chai.expect;

describe('Text chat models', function() {
  "use strict";

  var sandbox, media, peer, createTextChat;

  function fakeSDP(str) {
    return {
      str: str,
      contains: function(what) {
        return this.str.indexOf(what) !== -1;
      }
    };
  }

  var fakeOffer = {type: "offer", sdp: fakeSDP("\nm=video aaa\nm=audio bbb")};
  var fakeAnswer = {type: "answer", sdp: fakeSDP("\nm=video ccc\nm=audio ddd")};
  var fakeDataChannel = {fakeDataChannel: true};

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    // stubbing port
    app.port = {
      on: sinon.spy(),
      postEvent: sinon.spy()
    };
    _.extend(app.port, Backbone.Events);

    // stubbing WebRTCCall#send
    sandbox.stub(WebRTC.prototype, "send");

    // mozRTCPeerConnection stub
    sandbox.stub(window, "mozRTCPeerConnection").returns({
      close: sandbox.spy(),
      addStream: sandbox.spy(),
      createAnswer: function(success) {
        success(fakeAnswer);
      },
      createOffer: function(success) {
        success(fakeOffer);
      },
      setLocalDescription: function(source, success) {
        success(source);
      },
      setRemoteDescription: function(source, success) {
        success(source);
      },
      createDataChannel: function() {
        fakeDataChannel.send = sandbox.spy();
        return fakeDataChannel;
      }
    });

    // text chat model dependencies
    media = new WebRTC();
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

        expect(textChat.media).to.be.an.instanceOf(WebRTC);
      });

      it("should accept a `peer` option", function() {
        var textChat = createTextChat();

        expect(textChat.peer).to.be.an.instanceOf(app.models.User);
      });
    });

    describe("#send", function() {
      it("should add and send a message over data channel when a " +
         "peer connection is ongoing", function() {
        var textChat = createTextChat();
        var entry = {nick: "niko", message: "hi"};

        textChat.media.state.current = "ongoing";
        textChat.send(entry);

        sinon.assert.calledOnce(media.send);

        expect(textChat).to.have.length.of(1);
        expect(textChat.at(0).get("nick")).to.equal("niko");
        expect(textChat.at(0).get("message")).to.equal("hi");
      });

      it("should buffer a message then send it over data channel once a " +
         "peer connection is established", function() {
        var textChat = createTextChat();
        var entry = {nick: "niko", message: "hi"};

        textChat.send(entry);
        textChat.media.trigger("dc:open");

        sinon.assert.calledOnce(media.send);
        expect(textChat).to.have.length.of(1);
        expect(textChat.at(0).get("nick")).to.equal("niko");
        expect(textChat.at(0).get("message")).to.equal("hi");
      });
    });

    describe("events", function() {
      it('should listen to the data channel `dc:message-in` event', function() {
        var textChat = createTextChat();
        sandbox.stub(textChat, "add");
        var event = {data: JSON.stringify({nick: "niko", message: "hi"})};

        textChat.media.trigger('dc:message-in', event);

        sinon.assert.calledOnce(textChat.add);
        sinon.assert.calledWithExactly(textChat.add,
                                       {nick: "niko", message: "hi"});
      });
    });

  });

});
