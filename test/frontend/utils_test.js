/* global app, chai, describe, it, beforeEach, afterEach, sinon */
var expect = chai.expect;

describe('Utils', function() {
  "use strict";

  describe("AudioLibrary", function() {
    var sandbox, fakeAudio;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      fakeAudio = {
        play: sinon.spy(),
        pause: sinon.spy()
      };
      sandbox.stub(window, "Audio").returns(fakeAudio);
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe("#constructor", function() {
      it("should construct a sound collection", function() {
        var audioLibrary = new app.utils.AudioLibrary({});

        expect(audioLibrary.sounds).to.deep.equal({});

        audioLibrary = new app.utils.AudioLibrary({
          foo: "/snd/foo.ogg",
          bar: "/snd/bar.ogg"
        });

        expect(audioLibrary.sounds).to.deep.equal({
          foo: fakeAudio,
          bar: fakeAudio
        });
      });
    });

    describe("#play", function() {
      it("should play a registered sound", function() {
        var audioLibrary = new app.utils.AudioLibrary({foo: "/snd/foo.ogg"});

        audioLibrary.play('foo');

        sinon.assert.calledOnce(fakeAudio.play);
      });

      it("should not play an unregistered sound", function() {
        var audioLibrary = new app.utils.AudioLibrary({});

        audioLibrary.play('foo');

        sinon.assert.notCalled(fakeAudio.play);
      });

      it("should play multiple sounds", function() {
        var audioLibrary = new app.utils.AudioLibrary({
          foo: "/snd/foo.ogg",
          bar: "/snd/bar.ogg"
        });

        audioLibrary.play('foo', 'bar');

        sinon.assert.calledTwice(fakeAudio.play);
      });
    });

    describe("#stop", function() {
      it("should stop a registered sound", function() {
        var audioLibrary = new app.utils.AudioLibrary({foo: "/snd/foo.ogg"});

        audioLibrary.stop('foo');

        sinon.assert.calledOnce(fakeAudio.pause);
      });

      it("should not handle unregistered sounds", function() {
        var audioLibrary = new app.utils.AudioLibrary({});

        audioLibrary.stop('foo');

        sinon.assert.notCalled(fakeAudio.pause);
      });

      it("should stop multiple sounds", function() {
        var audioLibrary = new app.utils.AudioLibrary({
          foo: "/snd/foo.ogg",
          bar: "/snd/bar.ogg"
        });

        audioLibrary.stop('foo', 'bar');

        sinon.assert.calledTwice(fakeAudio.pause);
      });
    });

  });

})
