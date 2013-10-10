/*global sinon, chai, GoogleContacts */
/* jshint expr:true, camelcase:false */

var expect = chai.expect;

describe("GoogleContacts", function() {
  var sandbox, fakePort, fakeGApi, sampleFeed;

  function caller(cb) {
    cb();
  }

  fakeGApi = {
    auth: {
      init: caller,
      authorize: function(config, cb) {
        cb({access_token: "token"});
      }
    }
  };

  sampleFeed = {
    feed: {
      entry: [{
        "gd$email": [{
          address: "foo@bar.com",
          primary: "true",
          rel: "http://schemas.google.com/g/2005#other"
        }, {
          address: "foo@baz.com",
          "rel": "http://schemas.google.com/g/2005#other"
        }]
      }, {
        "gd$email": [{
          address: "bar@bar.com",
          primary: "true",
          rel: "http://schemas.google.com/g/2005#other"
        }]
      }, {
        /* empty record */
      }]
    }
  };

  beforeEach(function() {
    $.removeCookie("tktest");
    sandbox = sinon.sandbox.create();
    fakePort = {
      postEvent: sandbox.spy()
    };
  });

  afterEach(function() {
    delete window.gapi;
    sandbox.restore();
  });

  describe("#constructor", function() {
    it("should construct an object", function() {
      expect(new GoogleContacts()).to.be.a("object");
    });

    it("should accept a port option", function() {
      expect(new GoogleContacts({port: fakePort}).port).eql(fakePort);
    });

    it("should accept a token option", function() {
      expect(new GoogleContacts({token: "plop"}).token).eql("plop");
    });

    it("should accept a maxResults option", function() {
      expect(new GoogleContacts({maxResults: 1337}).maxResults).eql(1337);
    });

    it("should accept a authCookieName option", function() {
      expect(new GoogleContacts({
        authCookieName: "plop"
      }).authCookieName).eql("plop");
    });

    it("should accept a authCookieTTL option", function() {
      expect(new GoogleContacts({
        authCookieTTL: 42
      }).authCookieTTL).eql(42);
    });

    it("should retrieve existing token from cookie by default", function() {
      sandbox.stub($, "cookie", function() {
        return "ok";
      });
      expect(new GoogleContacts().token).eql("ok");
    });
  });

  describe("#authorize", function() {
    it("should pass an error if the google api client is unavailable",
      function(done) {
        new GoogleContacts({authCookieName: "tktest"}).authorize(function(err) {
          expect(err).to.be.an.instanceOf(Error);
          done();
        });
      });

    it("should request authorization to access user's contact", function(done) {
      window.gapi = fakeGApi;
      new GoogleContacts({authCookieName: "tktest"}).authorize(function(err) {
        // if we reach this point, we know gapi has been used as expected
        expect(err).to.be.a("null");
        done();
      });
    });

    it("should store received authorization token as a property",
      function(done) {
        window.gapi = fakeGApi;
        new GoogleContacts({authCookieName: "tktest"}).authorize(function() {
          expect(this.token).eql("token");
          done();
        });
      });

    it("should store received authorization token in a cookie",
      function(done) {
        window.gapi = fakeGApi;
        sandbox.stub($, "cookie");
        new GoogleContacts({
          authCookieName: "tktest",
          authCookieTTL: 42
        }).authorize(function() {
          sinon.assert.calledTwice($.cookie); // first call for reading cookie
          sinon.assert.calledWithExactly($.cookie, "tktest", "token", {
            expires: 42
          });
          done();
        });
      });

    it("should pass back auth errors", function(done) {
      window.gapi = fakeGApi;
      fakeGApi.auth.authorize = function(config, cb) {
        cb({access_token: undefined});
      };

      var gc = new GoogleContacts();
      gc.authorize(function(err) {
        expect(err).to.match(/missing auth token/);
        done();
      });
    });
  });

  describe("#all", function() {
    var xhr, request;

    beforeEach(function() {
      xhr = sinon.useFakeXMLHttpRequest();
      xhr.onCreate = function (xhrRequest) {
        request = xhrRequest;
      };
    });

    afterEach(function() {
      xhr.restore();
    });

    it("should pass an error back if auth token isn't set", function(done) {
      new GoogleContacts({authCookieName: "tktest"}).all(function(err) {
        expect(err.toString()).to.match(/Missing/);
        done();
      });
    });

    it("should request the endpoint url using current token value",
      function(done) {
        new GoogleContacts({token: "fake"}).all(function() {
          expect(request.url).to.match(/access_token=fake/);
          done();
        });

        request.respond(200, {"Content-Type": "application/json"}, "{}");
      });

    it("should request the endpoint url using default maxResults value",
      function(done) {
        new GoogleContacts({token: "fake"}).all(function() {
          expect(request.url).to.match(/max-results=9999/);
          done();
        });

        request.respond(200, {"Content-Type": "application/json"}, "{}");
      });

    it("should request the endpoint url using a custom maxResults option value",
      function(done) {
        new GoogleContacts({token: "fake", maxResults: 42}).all(function() {
          expect(request.url).to.match(/max-results=42/);
          done();
        });

        request.respond(200, {"Content-Type": "application/json"}, "{}");
      });

    it("should load, parse and normalize google contacts", function() {
      var callback = sinon.spy();

      new GoogleContacts({token: "foo"}).all(callback);
      request.respond(200, {
        "Content-Type": "application/json"
      }, JSON.stringify(sampleFeed));

      sinon.assert.calledOnce(callback);
      sinon.assert.calledWith(callback, null, [
        {username: "foo@bar.com"},
        {username: "foo@baz.com"},
        {username: "bar@bar.com"}
      ]);
    });

    it("should pass back encountered an HTTP error", function() {
      var callback = sinon.spy();

      new GoogleContacts({token: "foo"}).all(callback);
      request.respond(401, {
        "Content-Type": "application/json"
      }, JSON.stringify({}));

      sinon.assert.calledOnce(callback);
      expect(callback.args[0][0].message).eql("Unauthorized");
    });

    it("should pass back a feed data normalization error", function() {
      var callback = sinon.spy();

      new GoogleContacts({token: "foo"}).all(callback);
      request.respond(200, {
        "Content-Type": "application/json"
      }, "{malformed}");

      sinon.assert.calledOnce(callback);
      expect(callback.args[0][0].message).to.match(/JSON\.parse/);
    });
  });

  describe("#loadContacts", function() {
    it("should notify port with retrieved list of contacts", function() {
      var contacts = [{username: "foo"}, {username: "bar"}];
      sandbox.stub(GoogleContacts.prototype, "authorize", caller);
      sandbox.stub(GoogleContacts.prototype, "all", function(cb) {
        cb(null, contacts);
      });

      new GoogleContacts({port: fakePort}).loadContacts();

      sinon.assert.calledOnce(fakePort.postEvent);
      sinon.assert.calledWithExactly(fakePort.postEvent,
                                     "talkilla.contacts",
                                     {contacts: contacts});
    });

    it("should notify port with auth errors", function() {
      var error = new Error("auth error");
      sandbox.stub(GoogleContacts.prototype, "authorize", function(cb) {
        cb(error);
      });

      new GoogleContacts({port: fakePort}).loadContacts();

      sinon.assert.calledWithExactly(fakePort.postEvent,
                                     "talkilla.contacts-error",
                                     error);
    });
  });

  describe("Importer", function() {
    describe("#constructor", function() {
      it("should construct an object", function() {
        expect(new GoogleContacts.Importer()).to.be.an("object");
      });

      it("should attach data feed", function() {
        var feed = {};
        expect(new GoogleContacts.Importer(feed).dataFeed).eql(feed);
      });
    });

    describe("#normalize", function() {
      it("should normalize data feed", function() {
        var normalized = new GoogleContacts.Importer(sampleFeed).normalize();
        expect(normalized).eql([
          {username: "foo@bar.com"},
          {username: "foo@baz.com"},
          {username: "bar@bar.com"}
        ]);
      });
    });
  });
});
