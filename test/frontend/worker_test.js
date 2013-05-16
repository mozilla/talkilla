/* global afterEach, beforeEach, chai, describe, handlers, it, sinon */
/* jshint expr:true */
var expect = chai.expect;

describe('Worker', function() {
  describe("#login", function() {
    var xhr, requests, sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      // XXX For some reason, sandbox.useFakeXMLHttpRequest doesn't want to work
      // nicely so we have to manually xhr.restore for now.
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = function (req) { requests.push(req); };
    });

    afterEach(function() {
      xhr.restore();
      sandbox.restore();
    });

    it("should call postEvent with a failure message if i pass in bad data",
      function() {
        handlers.postEvent = sandbox.spy();
        handlers['talkilla.login']({topic: "talkilla.login", data: null});
        sinon.assert.calledOnce(handlers.postEvent);
        sinon.assert.calledWith(handlers.postEvent, "talkilla.login-failure");
      });

    it("should call postEvent with a pending message if I pass in valid data",
      function() {
        handlers.postEvent = sandbox.spy();
        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {username: "jb"}
        });
        sinon.assert.calledOnce(handlers.postEvent);
        sinon.assert.calledWith(handlers.postEvent, "talkilla.login-pending");
      });

    it("should post an ajax message to the server if I pass valid login data",
      function() {
        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {username: "jb"}
        });
        expect(requests.length).to.equal(1);
        expect(requests[0].url).to.equal('/signin');
        expect(requests[0].requestBody).to.be.not.empty;
        expect(requests[0].requestBody).to.be.equal('{"nick":"jb"}');
      });

    it("should post a success message if the server accepted login",
      function() {
        handlers.postEvent = sinon.spy();
        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {username: "jb"}
        });
        expect(requests.length).to.equal(1);

        requests[0].respond(200, { 'Content-Type': 'application/json' },
                            '{"nick":"jb"}' );

        sinon.assert.calledTwice(handlers.postEvent);
        sinon.assert.calledWith(handlers.postEvent, "talkilla.login-success");
      });
  });
});

