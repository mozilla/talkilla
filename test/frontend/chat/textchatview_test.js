/*global app, chai, sinon, ChatApp, WebRTC */
/* jshint expr:true */
"use strict";

var expect = chai.expect;

describe("Text chat views", function() {
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

      localStorage.removeItem('notFirstMessage');
    });

    afterEach(function() {
      $('#textchat').remove();
    });

    it("should be empty by default", function() {
      var view = new app.views.TextChatView({
        call: new app.models.Call(),
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
        call: new app.models.Call(),
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
      chatApp.appPort.trigger("talkilla.conversation-open", {
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

    describe("#initialize", function() {

      var view;

      beforeEach(function() {
        var collection = new app.models.TextChat([], {
          media: media,
          user: user,
          peer: peer
        });
        sandbox.stub(collection, "on");
        view = new app.views.TextChatView({
          call: new app.models.Call(),
          collection: collection
        });
      });

      it("should have placeholder for the first message", function() {
        view.render();

        // XXX: Check for text to be present and not exact text message
        expect(view.$('form input[name="message"]').attr('placeholder'))
              .to.equal('Type something to start chatting');
      });

      it("should listen to start of peer's typing activity", function() {
        sinon.assert.called(view.collection.on);
        sinon.assert.calledWith(view.collection.on, "chat:type-start");
      });

      it("should listen to stop of peer's typing activity", function() {
        sinon.assert.called(view.collection.on);
        sinon.assert.calledWith(view.collection.on, "chat:type-stop");
      });
    });

    describe("Public Events", function() {

      var view;

      beforeEach(function() {
        view = new app.views.TextChatView({
          call: new app.models.Call(),
          collection: new app.models.TextChat([], {
            media: media,
            user: user,
            peer: peer
          })
        });
      });

      describe("#_showTypingNotification", function() {
        it("should add the typing class", function() {
          view.collection.trigger('chat:type-start', {nick:'hardfire'});

          expect(view.$el.hasClass('typing')).to.be.equal(true);
        });

        it("should add a data nick attribute", function() {
          view.collection.trigger('chat:type-start', {nick:'avinash'});

          expect(view.$('ul').attr('data-nick')).eql('avinash');
        });
      });

      describe("#_clearTypingNotification", function() {
        it("should remove the typing class", function() {
          view.$el.addClass('typing');

          view.collection.trigger('chat:type-stop');

          expect(view.$el.hasClass('typing')).to.be.equal(false);
        });
      });

      it("should focus on the input textbox", function() {
        // stubbing focus because travis setup doesnt handle focus correctly
        sandbox.stub($.fn, 'focus');
        var view = new app.views.TextChatView({
          call: new app.models.Call(),
          collection: new app.models.TextChat([], {
            media: media,
            user: user,
            peer: peer
          })
        });

        sinon.assert.calledOnce(view.$('form input[name="message"]').focus);
      });
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

      it("should not have placeholder text after first message", function() {

        //send a test mesage
        $('#textchat [name="message"]').val("plop");
        $("#textchat form").trigger("submit");

        expect(textChatView.$('form input[name="message"]').attr('placeholder'))
              .to.equal(undefined);
      });
    });

    describe("#sendTyping", function() {
      it("should call collection.notifyTyping()", function() {
        var view = new app.views.TextChatView({
          call: new app.models.Call(),
          collection: new app.models.TextChat([], {
            media: media,
            user: user,
            peer: peer
          })
        });

        sandbox.stub(view.collection, "notifyTyping");

        view.sendTyping();

        sinon.assert.calledOnce(view.collection.notifyTyping);
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
