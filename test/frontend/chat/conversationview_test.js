/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe("ConversationView", function() {
  var sandbox, call, textChat, oldtitle, user, peer;

  beforeEach(function() {
    $('#fixtures').append([
      '<link rel="icon"/>',
      '<div id="notifications"></div>',
      '<div id="textchat">',
      '  <ul></ul>',
      '  <form><input name="message"></form>',
      '</div>'
    ].join(''));

    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "close");
    oldtitle = document.title;

    // XXX This should probably be a mock, but sinon mocks don't seem to want
    // to work with Backbone.
    var media = {
      answer: sandbox.spy(),
      establish: sandbox.spy(),
      initiate: sandbox.spy(),
      terminate: sandbox.spy(),
      on: sandbox.stub()
    };
    _.extend(media, Backbone.Events);

    call = new app.models.Call({}, {media: media});
    user = new app.models.User();
    peer = new app.models.User();
    sandbox.stub(peer, "on");
    textChat = new app.models.TextChat(null, {
      media: media,
      user: user,
      peer: peer
    });
  });

  afterEach(function() {
    document.title = oldtitle;
    sandbox.restore();
    $('#fixtures').empty();
  });

  describe("#initialize", function() {

    it("should attach a given call model", function() {
      var view = new app.views.ConversationView({
        call: call,
        peer: peer,
        user: user,
        textChat: textChat
      });

      expect(view.call).to.equal(call);
    });

    it("should attach a given peer model", function() {
      var view = new app.views.ConversationView({
        call: call,
        peer: peer,
        user: user,
        textChat: textChat
      });

      expect(view.peer).to.equal(peer);
    });

    it("should attach a given user model", function() {
      var view = new app.views.ConversationView({
        call: call,
        peer: peer,
        user: user,
        textChat: textChat
      });

      expect(view.user).to.equal(user);
    });

    it("should have a textChat model", function() {
      var view = new app.views.ConversationView({
        call: call,
        peer: peer,
        user: user,
        textChat: textChat
      });

      expect(view.textChat).to.equal(textChat);
    });

    it("should throw an error when no call model is given", function() {
      function shouldExplode() {
        new app.views.ConversationView({
          peer: peer,
          user: user,
          textChat: textChat
        });
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: call/);
    });

    it("should throw an error when no peer model is given", function() {
      function shouldExplode() {
        new app.views.ConversationView({
          user: user,
          call: call,
          textChat: textChat
        });
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: peer/);
    });

    it("should throw an error when no user model is given", function() {
      function shouldExplode() {
        new app.views.ConversationView({
          call: call,
          peer: peer,
          textChat: textChat
        });
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: user/);
    });

    it("should throw an error when no textChat model is given", function() {
      function shouldExplode() {
        new app.views.ConversationView({
          user: user,
          call: call,
          peer: peer
        });
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: textChat/);
    });

    it("should listen to peer's nick change", function() {
      new app.views.ConversationView({
        call: call,
        peer: peer,
        user: user,
        textChat: textChat
      });

      sinon.assert.called(peer.on);
      sinon.assert.calledWith(peer.on, "change:nick");
    });

    it("should listen to peer's presence change", function() {
      new app.views.ConversationView({
        call: call,
        peer: peer,
        user: user,
        textChat: textChat
      });

      sinon.assert.called(peer.on);
      sinon.assert.calledWith(peer.on, "change:presence");
    });

    it("should update the document title on change of the peer's details",
      function() {
        peer.set({nick: "nick"});
        new app.views.ConversationView({
          call: call,
          peer: peer,
          user: user,
          textChat: textChat
        });

        peer.on.args[0][1](peer);

        expect(document.title).to.be.equal("nick");
      });

    it("should update presence icon when peer's is connected", function() {
      sandbox.restore(peer.on);
      var view = new app.views.ConversationView({
        call: call,
        peer: peer,
        user: user,
        textChat: textChat,
        el: '#fixtures'
      });

      peer.set({presence: "connected"});

      expect(view.$('link[rel="icon"]').attr('href')).to.equal(
        'img/presence/connected.png');
    });

    it("should update presence icon when peer's is disconnected", function() {
      peer.set('presence', 'connected');
      sandbox.restore(peer.on);
      var view = new app.views.ConversationView({
        call: call,
        peer: peer,
        user: user,
        textChat: textChat,
        el: '#fixtures'
      });

      peer.set({presence: "disconnected"});

      expect(view.$('link[rel="icon"]').attr('href')).to.equal(
        'img/presence/disconnected.png');
    });

    describe("drag and drop events", function() {
      function fakeDropEvent(data) {
        return {
          preventDefault: function() {},
          originalEvent: {
            dataTransfer: {
              types: {
                contains: function(what) {
                  return what in data;
                }
              },
              getData: function(what) {
                return data[what];
              }
            }
          }
        };
      }

      function fakeDropFileEvent(data) {
        return {
          preventDefault: function() {},
          originalEvent: {
            dataTransfer: {
              types: {
                contains: function(what) {
                  return what in data;
                }
              },

              files: ["file1", "file2"]
            }
          }
        };
      }

      it("should set a text message input value on dropped url event",
        function() {
          var view = new app.views.ConversationView({
            call: call,
            peer: peer,
            user: user,
            textChat: textChat,
            el: '#fixtures'
          });
          var dropEvent = fakeDropEvent({
            "text/x-moz-url": "http://mozilla.com\nMozilla"
          });

          view.drop(dropEvent);

          expect(view.render().$('form input').val()).to.equal(
            "http://mozilla.com");
        });

      it("should set a text message input value on dropped tab event",
        function() {
          var view = new app.views.ConversationView({
            call: call,
            peer: peer,
            user: user,
            textChat: textChat,
            el: '#fixtures'
          });
          var dropEvent = fakeDropEvent({
            "text/x-moz-text-internal": "http://mozilla.com"
          });

          view.drop(dropEvent);

          expect(view.render().$('form input').val()).to.equal(
            "http://mozilla.com");
        });

      it("should not set a text message input value on unsupported drop event",
        function() {
          var view = new app.views.ConversationView({
            call: call,
            peer: peer,
            user: user,
            textChat: textChat,
            el: '#fixtures'
          });
          var dropEvent = fakeDropEvent({
            "text/x-foobar": "xxx"
          });

          view.drop(dropEvent);

          expect(view.render().$('form input').val()).to.equal("");
        });

      it("should add a file transfer to the chat", function() {
        sandbox.stub(textChat, "add", function(entry) {
          expect(entry).to.be.an.instanceOf(app.models.FileTransfer);
        });
        var view = new app.views.ConversationView({call: call,
                                                   peer: peer,
                                                   user: user,
                                                   textChat: textChat,
                                                   el: '#fixtures'});
        var dropEvent = fakeDropFileEvent({
          "application/x-moz-file": "xxx"
        });

        view.drop(dropEvent);

        sinon.assert.calledTwice(textChat.add); // 2 files has been added
      });
    });
  });

  describe("*-stream:ready events", function() {
    var view, fakeStream = "fakeStream";

    beforeEach(function() {
      view = new app.views.ConversationView({
        call: call,
        peer: peer,
        user: user,
        textChat: textChat,
        el: '#fixtures'
      });
    });

    afterEach(function() {
      view = null;
    });

    it("should enable the has-video class for video calls when the local " +
      "stream is ready",
      function() {
        sandbox.stub(view.call, "requiresVideo").returns(true);

        view.call.media.trigger("local-stream:ready", fakeStream);

        expect($("#fixtures").hasClass("has-video")).to.equal(true);
      });

    it("should disable the has-video class for audio calls when the local " +
      "stream is ready", function() {
      sandbox.stub(view.call, "requiresVideo").returns(false);

      view.call.media.trigger("local-stream:ready", fakeStream);

      expect($("#fixtures").hasClass("has-video")).to.equal(false);
    });

    it("should enable the has-video class for video calls when the remote " +
      "stream is ready",
      function() {
        sandbox.stub(view.call, "requiresVideo").returns(true);

        view.call.media.trigger("remote-stream:ready", fakeStream);

        expect($("#fixtures").hasClass("has-video")).to.equal(true);
      });

    it("should disable the has-video class for audio calls when the remote " +
      "stream is ready", function() {
      sandbox.stub(view.call, "requiresVideo").returns(false);

      view.call.media.trigger("remote-stream:ready", fakeStream);

      expect($("#fixtures").hasClass("has-video")).to.equal(false);
    });

    // TODO we'll need to write this and make it pass as soon as hanging
    // up the call doesn't make the window close
    it("should remove the has-video class for video calls once the last" +
      " stream has terminated");
  });

  describe("ICE state change events", function() {
    var view;

    beforeEach(function() {
      view = new app.views.ConversationView({
        call: call,
        peer: peer,
        user: user,
        textChat: textChat,
        el: '#fixtures'
      });
    });

    afterEach(function() {
      view = null;
    });

    describe("ice:failed", function() {
      it("should display a fail notification", function() {
        view.call.media.trigger("ice:failed");

        expect($("#fixtures .alert")).to.have.length.of(1);
        expect($("#fixtures .alert").text()).to.match(/could not be connected/);
      });
    });

    describe("ice:disconnected", function() {
      it("should display a disconnection notification", function() {
        view.call.media.trigger("ice:disconnected");

        expect($("#fixtures .alert")).to.have.length.of(1);
        expect($("#fixtures .alert").text()).to.match(/was disconnected/);
      });
    });

    describe("notification clearance", function() {
      beforeEach(function() {
        view.call.media.trigger("ice:failed");
      });

      it("ice:new should clear any pending notification", function() {
        view.call.media.trigger("ice:new");

        expect($("#fixtures .alert")).to.have.length.of(0);
      });

      it("ice:checking should clear any pending notification", function() {
        view.call.media.trigger("ice:checking");

        expect($("#fixtures .alert")).to.have.length.of(0);
      });

      it("ice:connected should clear any pending notification", function() {
        view.call.media.trigger("ice:connected");

        expect($("#fixtures .alert")).to.have.length.of(0);
      });

      it("ice:completed should clear any pending notification", function() {
        view.call.media.trigger("ice:completed");

        expect($("#fixtures .alert")).to.have.length.of(0);
      });
    });
  });

  describe("Call Hold state change events", function() {
    var view, clock;

    beforeEach(function() {
      view = new app.views.ConversationView({
        call: call,
        peer: peer,
        user: user,
        textChat: textChat,
        el: '#fixtures'
      });

      peer.set("nick", "hardfire");
      clock = sinon.useFakeTimers();
    });

    afterEach(function() {
      clock.restore();
      view = null;
    });

    describe("hold", function() {
      it("should display hold notification", function() {
        view.call.trigger('state:to:hold');

        expect($("#fixtures .alert")).to.have.length.of(1);
        expect($("#fixtures .alert").text()).to
          .match(/hardfire has placed you on hold/);
      });

      it("should disable the has-video class for video calls", function() {
        view.call.trigger('state:to:hold');

        expect($("#fixtures").hasClass("has-video")).to.equal(false);
      });
    });

    describe("resume", function() {
      it("should display a resume notification", function() {
        view.call.trigger('change:state', 'ongoing', 'hold');

        expect($("#fixtures .alert")).to.have.length.of(1);
        expect($("#fixtures .alert").text()).to.match(/hardfire is back/);
      });

      it("should clear the resume notification after a timeout", function() {
        view.call.trigger('change:state', 'ongoing', 'hold');
        clock.tick(5100);

        expect($("#fixtures .alert")).to.have.length.of(0);
      });

      it("should enable the has-video class for video calls", function() {
        sandbox.stub(view.call, "requiresVideo").returns(true);

        view.call.trigger('change:state', 'ongoing', 'hold');

        expect($("#fixtures").hasClass("has-video")).to.equal(true);
      });

      it("should disable the has-video class for audio calls", function() {
        sandbox.stub(view.call, "requiresVideo").returns(false);

        view.call.trigger('change:state', 'ongoing', 'hold');

        expect($("#fixtures").hasClass("has-video")).to.equal(false);
      });
    });
  });
});
