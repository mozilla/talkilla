/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, $ */

/* jshint expr:true */
var expect = chai.expect;

describe("Text chat views", function() {
  "use strict";

  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "open");
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('TextChatEntryView', function() {
    it("should register a click event for message links", function() {
      new app.views.TextChatEntryView({
        model: new app.models.TextChatEntry({
          nick: "jb",
          message: 'hi http://mozilla.com/'
        })
      }).render().$('a.chat-link').click();

      sinon.assert.calledWith(window.open, "http://mozilla.com/");
    });
  });

  describe('TextChatView', function() {

    var chatApp, call, media, peer;

    beforeEach(function() {
      $('body').append([
        '<div id="textchat">',
        '  <ul></ul>',
        '  <form><input name="message"></form>',
        '</div>'
      ].join(''));

      sandbox.stub(navigator, "mozGetUserMedia");
      sandbox.stub(window, "mozRTCPeerConnection").returns({
        createDataChannel: function() {}
      });

      sandbox.stub(window, "Audio").returns({
        play: sinon.spy(),
        pause: sinon.spy()
      });

      // This stops us changing the document's title unnecessarily
      sandbox.stub(app.views.ConversationView.prototype, "initialize");

      chatApp = new ChatApp();
      media = chatApp.call.media;
      peer = chatApp.peer;

      app.data.user.set("nick", "niko");
    });

    afterEach(function() {
      $('#textchat').remove();
    });

    it("should be empty by default", function() {
      var view = new app.views.TextChatView({
        collection: new app.models.TextChat([], {media: media, peer: peer})
      });

      expect(view.collection).to.have.length.of(0);

      view.render();

      expect(view.$('ul').html()).to.equal('');
    });

    it("should update rendering when its collection is updated", function() {
      var view = new app.views.TextChatView({
        collection: new app.models.TextChat([
          {nick: "niko", message: "plop"},
          {nick: "jb", message: "hello"}
        ], {media: media, peer: peer})
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
      chatApp.textChatView.collection.media.connected = true;
      app.port.trigger("talkilla.conversation-open", {peer: "niko"});
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
