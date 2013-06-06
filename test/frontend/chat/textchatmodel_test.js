/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, _, Backbone */

/* jshint expr:true */
var expect = chai.expect;

describe('Text chat', function() {
  "use strict";

  describe("app.models.TextChatEntry", function() {
    it("should be initialized with defaults", function() {
      var entry = new app.models.TextChatEntry();
      expect(entry.get("nick")).to.be.a("undefined");
      expect(entry.get("message")).to.be.a("undefined");
      expect(entry.get("date")).to.be.a("number");
    });
  });

  describe("app.models.TextChat", function() {
    it("#newEntry should add an entry and trigger the `entry.created` event",
      function(done) {
        var textChat = new app.models.TextChat();
        var entry = new app.models.TextChatEntry({nick: "niko", message: "hi"});

        textChat.on('entry.created', function(receivedEntry) {
          expect(receivedEntry.toJSON()).to.deep.equal(entry.toJSON());
          done();
        });

        textChat.newEntry(entry);
      });
  });

  describe('chatApp events for text chat', function () {
    var sandbox, chatApp;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      app.port = {postEvent: sinon.spy()};
      _.extend(app.port, Backbone.Events);
      chatApp = new ChatApp();
    });

    afterEach(function() {
      app.port.off();
      sandbox.restore();
    });

    it('should update text chat when a dc.in.message event is received',
      function() {
        chatApp.webrtc.trigger('dc.in.message', {
          data: JSON.stringify({nick: "niko", message: "hi"})
        });
        expect(chatApp.textChat).to.have.length.of(1);
        expect(chatApp.textChat.at(0).get('nick')).to.equal("niko");
        expect(chatApp.textChat.at(0).get('message')).to.equal("hi");

        chatApp.webrtc.trigger('dc.in.message', {
          data: JSON.stringify({nick: "jb", message: "hi niko"})
        });
        expect(chatApp.textChat).to.have.length.of(2);
        expect(chatApp.textChat.at(1).get('nick')).to.equal("jb");
        expect(chatApp.textChat.at(1).get('message')).to.equal("hi niko");
      });

    it('should listen to `entry.created` to send an entry over data channel',
      function(done) {
        // the chat app listens to the TextChat collection `entry.created` event
        var textChat = chatApp.textChat;
        var sendStub = sandbox.stub(app.models.WebRTCCall.prototype, "send");
        var entry = new app.models.TextChatEntry({nick: "niko", message: "hi"});

        textChat.on('entry.created', function(receivedEntry) {
          expect(receivedEntry.toJSON()).to.deep.equal(entry.toJSON());
          sinon.assert.calledWith(sendStub, JSON.stringify(entry.toJSON()));
          done();
        });

        textChat.newEntry(entry);
      });
  });
});
