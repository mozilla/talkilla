/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, $, _, Backbone */

/* jshint expr:true */
var expect = chai.expect;

describe('TextChatView', function() {
  "use strict";
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
