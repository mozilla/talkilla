/* global app, chai, describe, it, sinon, beforeEach, afterEach, ChatApp, $,
          WebRTC */

/* jshint expr:true */
var expect = chai.expect;

describe("Text chat views", function() {
  "use strict";

  function fakeSDP(str) {
    return {
      str: str,
      contains: function(what) {
        return this.str.indexOf(what) !== -1;
      }
    };
  }

  var sandbox, user;
  var fakeOffer = {type: "offer", sdp: fakeSDP("\nm=video aaa\nm=audio bbb")};
  var fakeAnswer = {type: "answer", sdp: fakeSDP("\nm=video ccc\nm=audio ddd")};
  var fakeDataChannel = {fakeDataChannel: true};

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "open");

    // mozSocial "mock"
    navigator.mozSocial = {
      getWorker: function() {
        return {
          port: {postMessage: sinon.spy()}
        };
      }
    };

    // mozGetUserMedia stub
    sandbox.stub(navigator, "mozGetUserMedia");

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

    user = new app.models.User();
  });

  afterEach(function() {
    user.clear();
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

    var call, media, peer;

    beforeEach(function() {
      $('body').append([
        '<div id="textchat">',
        '  <ul></ul>',
        '  <form><input name="message"></form>',
        '</div>'
      ].join(''));

      sandbox.stub(window, "Audio").returns({
        play: sinon.spy(),
        pause: sinon.spy()
      });

      // This stops us changing the document's title unnecessarily
      sandbox.stub(app.views.ConversationView.prototype, "initialize");

      sandbox.stub(WebRTC.prototype, "send");
      media = new WebRTC();
      call = new app.models.Call({}, {media: media});

      peer = new app.models.User();

      user.set({nick: "niko"});
    });

    afterEach(function() {
      $('#textchat').remove();
    });

    it("should be empty by default", function() {
      var view = new app.views.TextChatView({
        collection: new app.models.TextChat([], {
          media: media,
          user: user,
          peer: peer
        })
      });

      expect(view.collection).to.have.length.of(0);

      view.render();

      expect(view.$('ul').html()).to.equal('');
    });

    it("should update rendering when its collection is updated", function() {
      user.set({nick: "niko"});
      var view = new app.views.TextChatView({
        sender: user,
        collection: new app.models.TextChat([
          {nick: "niko", message: "plop"},
          {nick: "jb", message: "hello"}
        ], {
          media: media,
          user: user,
          peer: peer
        })
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
      var chatApp = new ChatApp();
      var textChat = chatApp.textChatView.collection;
      chatApp.port.trigger("talkilla.conversation-open", {
        peer: "niko",
        user: "jb"
      });
      expect(textChat).to.have.length.of(0);

      textChat.once("add", function(entry) {
        expect(entry).to.be.an.instanceOf(app.models.TextChatEntry);
        expect(entry.get("nick")).to.equal("jb");
        expect(entry.get("message")).to.equal("plop");
        done();
      });

      $('#textchat [name="message"]').val("plop");
      $("#textchat form").trigger("submit");
    });

    it("should not allow the caller to send an empty message",
      function() {
        var chatApp = new ChatApp();
        var textChat = chatApp.textChatView.collection;
        sandbox.stub(textChat, "add");

        $('#textchat [name="message"]').val("");
        $("#textchat form").trigger("submit");

        sinon.assert.callCount(textChat.add, 0);
      });

    describe("#render", function() {
      var textChatView, textChat, blob;

      beforeEach(function() {
        sandbox.stub(call, "on");

        textChat = new app.models.TextChat(null, {
          media: media,
          user: user,
          peer: peer
        });
        textChatView = new app.views.TextChatView({
          call: call,
          collection: textChat
        });

        blob = new Blob(['content'], {type: 'plain/text'});
      });

      it("should render a FileTransferView", function() {
        sandbox.stub(app.views.FileTransferView.prototype, "render",
          function() {
            return this;
          });
        textChat.add(new app.models.FileTransfer({file: blob},
                                                 {chunkSize: 512}));
        app.views.FileTransferView.prototype.render.reset();

        textChatView.render();

        sinon.assert.calledOnce(app.views.FileTransferView.prototype.render);
      });
    });
  });
});

describe("FileTransferView", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it("should bind render to model change events", function() {
    sandbox.stub(app.views.FileTransferView.prototype, "render");

    var file = {name: "toto", size: 10};
    var transfer = new app.models.FileTransfer({file: file}, {chunkSize: 1});
    var view = new app.views.FileTransferView({model: transfer});

    transfer.trigger("change");

    sinon.assert.calledOnce(view.render);
  });
});
