/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, $, _, Backbone */

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

  describe('app.views.TextChatView', function() {
    var chatApp, webrtc, sandbox;

    beforeEach(function() {
      $('body').append([
        '<div id="textchat">',
        '  <ul></ul>',
        '  <form><input name="message"></form>',
        '</div>'
      ].join(''));
      sandbox = sinon.sandbox.create();
      sandbox.stub(navigator, "mozGetUserMedia");
      sandbox.stub(window, "mozRTCPeerConnection").returns({
        createDataChannel: function() {}
      });
      webrtc = new app.models.WebRTCCall();
      chatApp = new ChatApp();
    });

    afterEach(function() {
      $('#textchat').remove();
      app.port.off();
      sandbox.restore();
      webrtc = null;
    });

    it("should be empty by default", function() {
      var view = new app.views.TextChatView({
        webrtc: webrtc,
        collection: new app.models.TextChat()
      });
      expect(view.collection).to.have.length.of(0);
      view.render();
      expect(view.$('ul').html()).to.equal('');
    });

    it("should update rendering when its collection is updated", function() {
      var view = new app.views.TextChatView({
        webrtc: webrtc,
        collection: new app.models.TextChat([
          {nick: "niko", message: "plop"},
          {nick: "jb", message: "hello"}
        ])
      });
      expect(view.collection).to.have.length.of(2);

      // check rendered view
      view.render();
      expect(view.$('li')).to.have.length.of(2);

      // add a new message to the conversation
      view.collection.add({nick: "niko", message: "how is it going?"});

      expect(view.collection).to.have.length.of(3);
      expect(view.$('li')).to.have.length.of(3);
    });

    it("should allow the caller to send a first message", function(done) {
      var textChat = chatApp.textChatView.collection;
      app.port.trigger("talkilla.call-start", {caller: "niko", callee: "jb"});
      expect(textChat).to.have.length.of(0);

      textChat.once("add", function(entry) {
        expect(entry).to.be.an.instanceOf(app.models.TextChatEntry);
        expect(entry.get("nick")).to.equal("niko");
        expect(entry.get("message")).to.equal("plop");
        done();
      });

      $('#textchat [name="message"]').val("plop");
      $("#textchat form").trigger("submit");
    });
  });

});
