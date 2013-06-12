/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, $ */

/* jshint expr:true */
var expect = chai.expect;

describe('TextChatView', function() {
  "use strict";
  var chatApp, webrtc, sandbox, call;

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

    // This stops us changing the document's title unnecessarily
    sandbox.stub(app.views.ChatView.prototype, "initialize");

    webrtc = new app.models.WebRTCCall();
    call = new app.models.Call({}, webrtc);
    chatApp = new ChatApp();
    app.data.user.set("nick", "niko");
  });

  afterEach(function() {
    $('#textchat').remove();
    sandbox.restore();
    webrtc = null;
  });

  it("should be empty by default", function() {
    var view = new app.views.TextChatView({
      call: call,
      collection: new app.models.TextChat()
    });
    expect(view.collection).to.have.length.of(0);
    view.render();
    expect(view.$('ul').html()).to.equal('');
  });

  it("should update rendering when its collection is updated", function() {
    var view = new app.views.TextChatView({
      call: call,
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

  describe("Change events", function() {
    var textChatView;

    beforeEach(function() {
      sandbox.stub(call, "on");

      textChatView = new app.views.TextChatView({
        call: call,
        collection: new app.models.TextChat()
      });
    });

    it("should attach to change:state events on the call model", function() {
      sinon.assert.calledOnce(call.on);
      sinon.assert.calledWith(call.on, 'change:state');
    });

    it("should show the element when change:state goes to ongoing",
      function() {
        textChatView.$el.hide();

        call.on.args[0][1]("ongoing");

        expect(textChatView.$el.is(":visible")).to.be.equal(true);
      });


    it("should hide the element when change:state goes to something != ongoing",
      function() {
        textChatView.$el.show();

        call.on.args[0][1]("dummy");

        expect(textChatView.$el.is(":visible")).to.be.equal(false);
      });
  });
});
