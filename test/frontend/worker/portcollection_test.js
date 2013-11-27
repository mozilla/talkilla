/*global chai, sinon, Port, PortCollection */
/* jshint expr:true */
"use strict";

var expect = chai.expect;

describe('Port', function() {
  it("should accept and configure a port", function() {
    var port = new Port({_portid: 1});
    expect(port.id).to.equal(1);
    expect(port.port.onmessage).to.be.a('function');
  });

  it("should post a message", function() {
    var spy = sinon.spy();
    var port = new Port({_portid: 1, postMessage: spy});
    port.postEvent('foo', 'bar');
    expect(spy.calledWith({topic: 'foo', data: 'bar'})).to.be.ok;
  });

  it("should post an error", function() {
    var spy = sinon.spy();
    var port = new Port({_portid: 1, postMessage: spy});
    port.error('error');
    expect(spy.calledWith({topic: 'talkilla.error', data: 'error'})).to.be.ok;
  });
});

describe('PortCollection', function() {
  it("should have empty port stack by default", function() {
    expect(new PortCollection().ports).to.deep.equal({});
  });

  it("should add a configured port to the stack", function() {
    var coll = new PortCollection();
    expect(coll.ports).to.be.a('object');
    expect(Object.keys(coll.ports)).to.have.length.of(0);
    coll.add(new Port({_portid: 1}));
    expect(Object.keys(coll.ports)).to.have.length.of(1);
    expect(coll.ports[1]).to.be.a('object');
    expect(coll.ports[1]).to.include.keys(['port', 'id']);
  });

  it("should find a port by its identifier", function() {
    var coll = new PortCollection();
    coll.add(new Port({_portid: 1}));
    coll.add(new Port({_portid: 42}));
    expect(coll.find(1).id).to.equal(1);
    expect(coll.find(42).id).to.equal(42);
    expect(coll.find(99)).to.be.a('undefined');
  });

  it("should not add the same port twice", function() {
    var coll = new PortCollection();
    var port = new Port({_portid: 1});
    coll.add(port);
    coll.add(port);
    expect(Object.keys(coll.ports)).to.have.length.of(1);
  });

  it("should be able to remove a port from the collection", function() {
    var coll = new PortCollection();
    var port1 = new Port({_portid: 1});
    coll.add(port1);
    coll.add(new Port({_portid: 2}));
    expect(Object.keys(coll.ports)).to.have.length.of(2);
    coll.remove(port1);
    expect(Object.keys(coll.ports)).to.have.length.of(1);
  });

  it("should find a port and post a message to it", function() {
    var coll = new PortCollection();
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    coll.add(new Port({_portid: 1, postMessage: spy1}));
    coll.add(new Port({_portid: 2, postMessage: spy2}));
    coll.find(2).postEvent('foo', 'bar');
    expect(spy1.called).to.equal(false);
    expect(spy2.calledWith({topic: 'foo', data: 'bar'})).to.be.ok;
  });

  it("should broadcast a message to all ports", function() {
    var coll = new PortCollection();
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    coll.add(new Port({_portid: 1, postMessage: spy1}));
    coll.add(new Port({_portid: 2, postMessage: spy2}));
    coll.broadcastEvent('foo', 'bar');
    expect(spy1.calledWith({topic: 'foo', data: 'bar'})).to.be.ok;
    expect(spy2.calledWith({topic: 'foo', data: 'bar'})).to.be.ok;
  });

  it("should broadcast an error to all ports", function() {
    var coll = new PortCollection();
    var spy1 = sinon.spy();
    var spy2 = sinon.spy();
    coll.add(new Port({_portid: 1, postMessage: spy1}));
    coll.add(new Port({_portid: 2, postMessage: spy2}));
    coll.broadcastError('error');
    expect(spy1.calledWith({topic: 'talkilla.error',
                            data: 'error'})).to.be.ok;
    expect(spy2.calledWith({topic: 'talkilla.error',
                            data: 'error'})).to.be.ok;
  });
});
