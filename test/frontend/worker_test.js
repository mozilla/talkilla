/* global afterEach, beforeEach, chai, describe, handlers, it, sinon,
          PortCollection */
/* jshint expr:true */
var expect = chai.expect;

describe('Worker', function() {
  describe('PortCollection', function() {
    it("should have empty port stack by default", function() {
      expect(new PortCollection().ports).to.deep.equal([]);
    });

    it("should add a configured port to the stack", function() {
      var coll = new PortCollection();
      expect(coll.ports).to.have.length.of(0);
      coll.add({});
      expect(coll.ports).to.have.length.of(1);
      expect(coll.ports[0]).to.be.a('object');
      expect(coll.ports[0]).to.include.keys('onmessage');
    });

    it("should broadcast a message to all ports", function() {
      var coll = new PortCollection();
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      coll.add({postMessage: spy1});
      coll.add({postMessage: spy2});
      coll.postEvent('foo', 'bar');
      expect(spy1.calledWith({topic: 'foo', data: 'bar'})).to.be.ok;
      expect(spy2.calledWith({topic: 'foo', data: 'bar'})).to.be.ok;
    });

    it("should broadcast an error to all ports", function() {
      var coll = new PortCollection();
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      coll.add({postMessage: spy1});
      coll.add({postMessage: spy2});
      coll.error('error');
      expect(spy1.calledWith({topic: 'talkilla.error',
                              data: 'error'})).to.be.ok;
      expect(spy2.calledWith({topic: 'talkilla.error',
                              data: 'error'})).to.be.ok;
    });
  });

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

    it("should post a fail message if the server rejected login",
      function() {
        handlers.postEvent = sinon.spy();
        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {username: "jb"}
        });
        expect(requests.length).to.equal(1);

        requests[0].respond(401, { 'Content-Type': 'text/plain' },
                            'Not Authorised' );

        sinon.assert.calledTwice(handlers.postEvent);
        sinon.assert.calledWith(handlers.postEvent, "talkilla.login-failure");

      });
  });
});
