/* global $, app, chai, describe, it, beforeEach, afterEach, sinon */
var expect = chai.expect;

describe("ConversationView", function() {
  "use strict";
  var sandbox;

  describe("#initialize", function() {
    var call, textChat, oldtitle, user, peer;

    beforeEach(function() {
      $('#fixtures').append([
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
      call = new app.models.Call({}, {media: media});
      user = new app.models.User();
      peer = new app.models.User();
      sandbox.stub(peer, "on");
      textChat = new app.models.TextChat(null, {
        media: media,
        user: user,
        peer: peer
      });

      sandbox.stub(call, "on");
    });

    afterEach(function() {
      document.title = oldtitle;
      sandbox.restore();
      $('#fixtures').empty();
    });

    it("should attach a given call model", function() {
      var view = new app.views.ConversationView({
        call: call,
        peer: peer,
        textChat: textChat
      });

      expect(view.call).to.equal(call);
    });

    it("should attach a given peer model", function() {
      var view = new app.views.ConversationView({
        call: call,
        peer: peer,
        textChat: textChat
      });

      expect(view.peer).to.equal(peer);
    });

    it("should have a textChat model", function() {
      var view = new app.views.ConversationView({
        call: call,
        peer: peer,
        textChat: textChat
      });

      expect(view.textChat).to.equal(textChat);
    });

    it("should throw an error when no call model is given", function() {
      function shouldExplode() {
        new app.views.ConversationView({peer: peer, textChat: textChat});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: call/);
    });

    it("should throw an error when no peer model is given", function() {
      function shouldExplode() {
        new app.views.ConversationView({call: call, textChat: textChat});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: peer/);
    });

    it("should throw an error when no textChat model is given", function() {
      function shouldExplode() {
        new app.views.ConversationView({call: call, peer: peer});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: textChat/);
    });

    it("should attach to the app user model", function() {
      new app.views.ConversationView({
        call: call,
        peer: peer,
        textChat: textChat
      });

      sinon.assert.called(peer.on);
      sinon.assert.calledWith(peer.on, "change:nick");
    });

    it("should update the document title on change of the peer's details",
      function() {
        peer.set({nick: "nick"});
        new app.views.ConversationView({
          call: call,
          peer: peer,
          textChat: textChat
        });

        peer.on.args[0][1](peer);

        expect(document.title).to.be.equal("nick");
      });

    it("should close the window when the call `offer-timeout` event is " +
       "triggered", function() {
        new app.views.ConversationView({
          call: call,
          peer: peer,
          textChat: textChat
        });

        call.trigger('offer-timeout');

        // offer-timeout is the second event triggered
        call.on.args[0][1]();

        sinon.assert.calledOnce(window.close);
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
});
