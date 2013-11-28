/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe('Utils', function() {
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
        pause: sinon.spy(),
        loop: false
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

    describe("#enableLoop", function() {
      it("should add a loop attribute to a sound", function() {
        var audioLibrary = new app.utils.AudioLibrary({foo: "/snd/foo.ogg"});

        audioLibrary.enableLoop('foo');

        expect(audioLibrary.sounds.foo.loop).to.be.equal(true);
      });

      it("should add loop attribute to multiple sounds", function() {
        var audioLibrary = new app.utils.AudioLibrary({
          foo: "/snd/foo.ogg",
          bar: "/snd/bar.ogg"
        });

        audioLibrary.enableLoop('foo', 'bar');

        expect(audioLibrary.sounds.foo.loop).to.be.equal(true);
        expect(audioLibrary.sounds.bar.loop).to.be.equal(true);
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
    var linkify = app.utils.linkify;

    function transformed(text, options) {
      return text !== _.unescape(linkify(text, options));
    }

    it("should properly escape HTML text", function() {
      expect(app.utils.linkify("<script>")).to.equal("&lt;script&gt;");
    });

    it("should properly escape HTML text but not URLs", function() {
      expect(app.utils.linkify("<script> http://foo.bar")).to.equal(
        '&lt;script&gt; <a href="http://foo.bar">http://foo.bar</a>');
    });

    it("should linkify a simple URL", function() {
      expect(linkify('foo http://foo.bar bar')).to.equal(
        'foo <a href="http://foo.bar">http://foo.bar</a> bar');
    });

    it("should linkify a URL with port", function() {
      expect(linkify('foo http://foo.bar:80 bar')).to.equal(
        'foo <a href="http://foo.bar:80">http://foo.bar:80</a> bar');
    });

    it("should linkify a URL with port and path", function() {
      expect(linkify('foo http://foo.bar:80/x bar')).to.equal(
        'foo <a href="http://foo.bar:80/x">http://foo.bar:80/x</a> bar');
    });

    it("should linkify a URL with complex path", function() {
      expect(linkify('foo http://aa.vv/x/y/z bar')).to.equal(
        'foo <a href="http://aa.vv/x/y/z">http://aa.vv/x/y/z</a> bar');
    });

    it("should linkify a URL with a query string", function() {
      expect(linkify('foo http://foo/?w=1 bar')).to.equal(
        'foo <a href="http://foo/?w=1">http://foo/?w=1</a> bar');
    });

    it("should linkify a URL with a hashbang", function() {
      expect(linkify('foo http://foo/?w=1&x=42#foo_bar bar')).to.equal(
        'foo <a href="http://foo/?w=1&amp;x=42#foo_bar">' +
        'http://foo/?w=1&amp;x=42#foo_bar</a> bar');
    });

    it("should linkify multiple URLs", function() {
      expect(linkify('a http://x.y/ b http://y.z/ c')).to.equal(
        'a <a href="http://x.y/">http://x.y/</a> ' +
        'b <a href="http://y.z/">http://y.z/</a> c');
    });

    it("should not linkify a non-URL word", function() {
      expect(transformed("plop")).to.equal(false);
    });

    it("should linkify a http link by default", function() {
      expect(transformed("http://plop")).to.equal(true);
    });

    it("should linkify a https link by default", function() {
      expect(transformed("https://plop")).to.equal(true);
    });

    it("should linkify a ftp link by default", function() {
      expect(transformed("ftp://plop")).to.equal(true);
    });

    it("should not linkify a mailto link by default", function() {
      expect(transformed("mailto:a@a.com")).to.equal(false);
    });

    it("should not linkify an unsupported scheme by default", function() {
      /* jshint scripturl:true */
      expect(transformed("javascript:plop()")).to.equal(false);
    });

    it("should not linkify an unsupported scheme by configuration",
      function() {
        expect(transformed("ftp://plop", {
          schemes: ["http"]
        })).to.equal(false);
      });

    it("should linkify text with urls setting custom attributes", function() {
      var result = app.utils.linkify("foo http://foo.bar/", {
        attributes: { target: '_blank' }
      });

      expect(result).to.equal(
        'foo <a target="_blank" href="http://foo.bar/">http://foo.bar/</a>');
    });

  });

  describe("#computeDisplayedVideoSize", function(){

    it("should throw an exception if the given stream width or height is 0",
      function() {
        function caller() {
          app.utils.computeDisplayedVideoSize([1,1], [0,0]);
        }

        expect(caller).to.throw(Error);
      });

    it("should return either size when stream and box sizes are identical",
      function() {
        var displaySize = app.utils.computeDisplayedVideoSize([640,400],
          [640,400]);
        expect(displaySize).to.deep.equal([640,400]);
      });

    it("should give the stream size when boxHeight==streamHeight and" +
      " boxWidth>streamWidth",
      function() {
        var displaySize = app.utils.computeDisplayedVideoSize([1280,400],
          [640,400]);
        expect(displaySize).to.deep.equal([640,400]);
      });

    it("should scale down correctly when boxHeight==streamHeight and" +
      "boxWidth<streamWidth",
      function() {
        var displaySize = app.utils.computeDisplayedVideoSize([640,200],
          [640,400]);
        expect(displaySize).to.deep.equal([320,200]);
      });

    it("should scale down correctly when boxHeight<streamHeight and" +
      " boxWidth==streamWidth",
      function() {
        var displaySize = app.utils.computeDisplayedVideoSize([320,200],
          [640,400]);
        expect(displaySize).to.deep.equal([320,200]);
      });

    it("should give the stream size when boxHeight>streamHeight and" +
      " boxWidth==streamWidth",
      function(){
        var displaySize = app.utils.computeDisplayedVideoSize([640,800],
          [640,400]);
        expect(displaySize).to.deep.equal([640,400]);
      });

    it("should scale up correctly when boxHeight>streamHeight and" +
      " boxWidth>streamWidth",
      function(){
        var displaySize = app.utils.computeDisplayedVideoSize([1280,800],
          [640,400]);
        expect(displaySize).to.deep.equal([1280,800]);
      });

    it("should scale down correctly when boxHeight<streamHeight and" +
      " boxWidth<streamWidth",
      function(){
        var displaySize = app.utils.computeDisplayedVideoSize([640,400],
          [1280,800]);
        expect(displaySize).to.deep.equal([640,400]);
      });

    it("should scale down correctly when boxHeight<streamHeight and" +
      " boxWidth>streamWidth",
      function(){
        var displaySize = app.utils.computeDisplayedVideoSize([640,400],
          [1280,200]);
        expect(displaySize).to.deep.equal([640,100]);
      });

    it("should scale down correctly when boxHeight>streamHeight and" +
      " boxWidth<streamWidth",
      function(){
        var displaySize = app.utils.computeDisplayedVideoSize([1280,200],
          [640,400]);
        expect(displaySize).to.deep.equal([320,200]);
      });

    /* XXX these two tests should be filled in and made to pass
     * once it's clearer what the desired API is.
     */
    it("should have defined behavior when sizes are non-integer multiples");
    it("should have defined behavior on zero-box-size elements");
  });

  describe("#id", function() {

    it("should generate random ids", function() {
      var first = app.utils.id();
      var second = app.utils.id();

      expect(first).to.not.equal(undefined);
      expect(second).to.not.equal(undefined);
      expect(first).to.not.equal(second);
    });

  });

});
