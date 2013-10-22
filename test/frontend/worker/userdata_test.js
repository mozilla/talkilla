/*global chai, sinon, UserData, browserPort:true */

var expect = chai.expect;


describe('UserData', function() {
  var sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    browserPort = {postEvent: sandbox.spy()};
  });

  afterEach(function () {
    browserPort = null;
    sandbox.restore();
  });


  describe('Initialize', function() {
    it("should be created with defaults values", function() {
      var userData = new UserData();
      expect(userData).to.include.keys(Object.keys(userData.defaults));
    });

    it("should accept initial values", function() {
      var userData = new UserData({name: "foo", connected: true});
      expect(userData).to.include.keys(Object.keys(userData.defaults));
      expect(userData.name).to.equal("foo");
      expect(userData.connected).to.equal(true);
    });

    it("should accept a configuration object and update settings accordingly",
      function() {
        var userData = new UserData({}, {ROOTURL: "http://fake"});
        expect(userData._rootURL).to.equal("http://fake");
      });
  });

  describe("#name", function() {
    var userData;

    beforeEach(function () {
      userData = new UserData();
    });

    afterEach(function() {
      userData = undefined;
    });

    it("should return the set value", function() {
      userData.name = "foo";

      expect(userData.name).to.be.equal("foo");
    });
    it("should call send when changed", function() {
      sandbox.stub(UserData.prototype, "send");

      userData.name = "foo";

      sinon.assert.calledOnce(userData.send);
    });
  });

  describe("#connected", function() {
    var userData;

    beforeEach(function() {
      userData = new UserData();
      sandbox.stub(UserData.prototype, "send");
    });

    afterEach(function() {
      userData = undefined;
    });

    it("should return the set value", function() {
      userData.connected = true;

      expect(userData.connected).to.be.equal(true);
    });

    it("should call send when changed", function() {
      userData.connected = true;

      sinon.assert.calledOnce(userData.send);
    });
  });

  describe("#reset", function() {
    it("should reset to defaults", function() {
      var userData = new UserData({name: "foo"});

      userData.reset();

      expect(userData).to.include.keys(Object.keys(userData.defaults));
      expect(userData.name).to.equal(undefined);
    });

    it("should send a message", function() {
      var userData = new UserData({name: "foo"});
      sandbox.stub(UserData.prototype, "send");

      userData.reset();

      sinon.assert.calledOnce(userData.send);
    });
  });

  describe("#send", function() {
    var userData;
    beforeEach(function() {
      userData = new UserData({name: 'jb'}, {ROOTURL: "http://fake"});
      browserPort.postEvent.reset();
    });

    afterEach(function() {
      userData = undefined;
    });

    it("should send a social.user-profile message", function () {
      userData.send();
      sinon.assert.calledOnce(browserPort.postEvent);

      var data = browserPort.postEvent.args[0][1];
      expect(data.userName).to.be.equal('jb');
      expect(data.displayName).to.be.equal('jb');
      expect(data.portrait).to.be
        .equal('http://fake/img/default-avatar.png');
      expect(data.iconURL).to.be.equal('http://fake/img/talkilla16.png');
      expect(data.profileURL).to.be.equal('http://fake/user.html');
    });

    it("should send an online image url if connected", function() {
      userData.connected = true;
      sinon.assert.calledOnce(browserPort.postEvent);

      var data = browserPort.postEvent.args[0][1];
      expect(data.iconURL).to.contain('online');
    });
  });
});

