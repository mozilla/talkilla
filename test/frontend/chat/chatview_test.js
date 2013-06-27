/* global $, app, chai, describe, it, beforeEach, afterEach, sinon */
var expect = chai.expect;

describe("ChatView", function() {
  "use strict";
  var sandbox;

  describe("#initialize", function() {
    var call, oldtitle;

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

      // Although we're not testing it in this set of tests, stub the WebRTCCall
      // model's initialize function, as creating new media items
      // (e.g. PeerConnection) takes a lot of time that we don't need to spend.
      sandbox.stub(app.models.WebRTCCall.prototype, "initialize");
      var media = new app.models.WebRTCCall();
      call = new app.models.Call({}, {media: media});

      sandbox.stub(call, "on");
    });

    afterEach(function() {
      document.title = oldtitle;
      sandbox.restore();
      $('#fixtures').empty();
    });

    it("should attach a given call model", function() {
      var view = new app.views.ChatView({call: call});

      expect(view.call).to.equal(call);
    });

    it("should throw an error when no call model is given", function() {
      function shouldExplode() {
        new app.views.ChatView({});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: call/);
    });

    it("should attach to the app user model", function() {
      new app.views.ChatView({call: call});

      sinon.assert.called(call.on);
      sinon.assert.calledWith(call.on, "change:peer");
    });

    it("should update the document title on change of user login details",
      function() {
        call.set("peer", "nick");

        new app.views.ChatView({call: call});

        call.on.args[0][1](call);

        expect(document.title).to.be.equal("nick");
      });

    it("should close the window when the call `offer-timeout` event is " +
       "triggered", function() {
        new app.views.ChatView({call: call});

        call.trigger('offer-timeout');

        // offer-timeout is the second event triggered
        call.on.args[1][1]();

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

      it("should set a text message input value on dropped url event",
        function() {
          var view = new app.views.ChatView({call: call, el: '#fixtures'});
          var dropEvent = fakeDropEvent({
            "text/x-moz-url": "http://mozilla.com\nMozilla"
          });

          view.drop(dropEvent);

          expect(view.render().$('form input').val()).to.equal(
            "http://mozilla.com");
        });

      it("should set a text message input value on dropped tab event",
        function() {
          var view = new app.views.ChatView({call: call, el: '#fixtures'});
          var dropEvent = fakeDropEvent({
            "text/x-moz-text-internal": "http://mozilla.com"
          });

          view.drop(dropEvent);

          expect(view.render().$('form input').val()).to.equal(
            "http://mozilla.com");
        });

      it("should not set a text message input value on unsupported drop event",
        function() {
          var view = new app.views.ChatView({call: call, el: '#fixtures'});
          var dropEvent = fakeDropEvent({
            "text/x-foobar": "xxx"
          });

          view.drop(dropEvent);

          expect(view.render().$('form input').val()).to.equal("");
        });
    });
  });
});
