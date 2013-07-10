/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, $, WebRTC */

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
    app.port.off();
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

    var chatApp, call;

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

      // port stubs
      app.port.on = sandbox.stub();
      app.port.postEvent = sandbox.stub();
      app.port.trigger = sandbox.stub();

      sandbox.stub(WebRTC.prototype, "send");
      call = new app.models.Call({}, {media: new WebRTC()});
      chatApp = new ChatApp();

      app.data.user.set("nick", "niko");
    });

    afterEach(function() {
      $('#textchat').remove();
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


      it("should hide the element when change:state goes to something !ongoing",
        function() {
          textChatView.$el.show();

          call.on.args[0][1]("dummy");

          expect(textChatView.$el.is(":visible")).to.be.equal(false);
        });
    });

    describe("#sendFile", function() {
      var textChatView;

      beforeEach(function() {
        sandbox.stub(call, "on");

        textChatView = new app.views.TextChatView({
          call: call,
          collection: new app.models.TextChat()
        });
      });

      it("should add a FileTransfer model to the collection", function() {
        var file = "fakeFile";
        var chunkSize = 512;
        var event = {target: {files: [file]}};
        sandbox.stub(textChatView.collection, "add", function(transfer) {
          expect(transfer.file).to.equal(file);
          expect(transfer.options.chunkSize).to.equal(chunkSize);
        });

        textChatView.sendFile(event);

        sinon.assert.calledOnce(textChatView.collection.add);
      });

    });

    describe("#render", function() {
      var textChatView, textChat, blob;

      beforeEach(function() {
        sandbox.stub(call, "on");

        textChat = new app.models.TextChat();
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
