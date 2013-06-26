/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, _, Backbone */

/* jshint expr:true */
var expect = chai.expect;

describe('Text chat models', function() {
  "use strict";

  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
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

    describe("#newEntry", function() {
      it("should add an entry and trigger the `entry.created` event",
        function(done) {
          var textChat = new app.models.TextChat();
          var entry = new app.models.TextChatEntry({
            nick: "niko",
            message: "hi"
          });

          textChat.on('entry.created', function(receivedEntry) {
            expect(receivedEntry.toJSON()).to.deep.equal(entry.toJSON());
            done();
          });

          textChat.newEntry(entry);
        });
    });

  });

  describe('chatApp events for text chat', function () {
    var chatApp;

    beforeEach(function() {
      app.port = {postEvent: sinon.spy()};
      _.extend(app.port, Backbone.Events);
      sandbox.stub(ChatApp.prototype, "_onDataChannelMessageIn");
      sandbox.stub(ChatApp.prototype, "_onTextChatEntryCreated");
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

    it('should listen to the text chat `entry.created` event', function() {
      var entry = new app.models.TextChatEntry({nick: "niko", message: "hi"});

      chatApp.textChat.trigger('entry.created', entry.toJSON());

      sinon.assert.calledOnce(chatApp._onTextChatEntryCreated);
      sinon.assert.calledWithExactly(chatApp._onTextChatEntryCreated,
                                     entry.toJSON());
    });
  });
});
