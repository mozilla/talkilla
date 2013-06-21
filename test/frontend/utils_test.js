/* global app, chai, describe, it, beforeEach, afterEach, sinon */
var expect = chai.expect;

describe('Utils', function() {
  "use strict";
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("AudioLibrary", function() {
    var fakeAudio;

    beforeEach(function() {
      fakeAudio = {
        play: sinon.spy(),
        pause: sinon.spy()
      };
      sandbox.stub(window, "Audio").returns(fakeAudio);
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

  describe("createLink", function() {
    it("should create a simple link", function() {
      expect(app.utils.createLink("http://foo.bar/")).to.equal(
        '<a href="http://foo.bar/">http://foo.bar/</a>');
    });

    it("should create a link specifying its attributes", function() {
      var result = app.utils.createLink("http://foo.bar/", {
        target: '_blank'
      });

      expect(result).to.equal(
        '<a target="_blank" href="http://foo.bar/">http://foo.bar/</a>');
    });
  });

  describe("linkify", function() {
    it("should linkify text links", function() {
      var cases = {
        'foo http://foo.bar bar':
          'foo <a href="http://foo.bar">http://foo.bar</a> bar',

        'foo http://foo.bar:80 bar':
          'foo <a href="http://foo.bar:80">http://foo.bar:80</a> bar',

        'foo http://foo.bar:80/x bar':
          'foo <a href="http://foo.bar:80/x">http://foo.bar:80/x</a> bar',

        'foo http://aa.vv/x/y/z bar':
          'foo <a href="http://aa.vv/x/y/z">http://aa.vv/x/y/z</a> bar',

        'foo http://foo/?w=1 bar':
          'foo <a href="http://foo/?w=1">http://foo/?w=1</a> bar',

        'foo http://foo/?w=1&x=42#foo_bar bar':
          'foo <a href="http://foo/?w=1&amp;x=42#foo_bar">' +
          'http://foo/?w=1&amp;x=42#foo_bar</a> bar',

        'a http://x.y/ b http://y.z/ c':
          'a <a href="http://x.y/">http://x.y/</a> b ' +
          '<a href="http://y.z/">http://y.z/</a> c'
      };

      for (var testCase in cases)
        expect(app.utils.linkify(testCase)).to.be.equal(cases[testCase]);
    });

    it("should linkify text with urls setting custom attributes", function() {
      var result = app.utils.linkify("foo http://foo.bar/", {
        attributes: { target: '_blank' }
      });

      expect(result).to.equal(
        'foo <a target="_blank" href="http://foo.bar/">http://foo.bar/</a>');
    });

    it("should properly escape HTML text", function() {
      expect(app.utils.linkify("<script>")).to.equal("&lt;script&gt;");
    });
  });

});
