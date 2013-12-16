/*global chai, sinon, browserDetection */
var expect = chai.expect;

describe("browserDetection.app", function() {
  "use strict";

  var sandbox, el, node, userAgent;
  beforeEach(function() {
    el = $('<div></div>');
    node = $("#fixtures").append(el).get()[0];

    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
    $("#fixtures").empty();
  });

  describe("#activateSocial", function() {

    it('should set the data-service attr on the given node to a JSON object',
      function() {
      sandbox.stub(node, "dispatchEvent");
      userAgent = navigator.userAgent;

      browserDetection.activateSocial(node, userAgent);

      var dataSvc = JSON.parse(node.getAttribute("data-service"));
      expect(dataSvc).to.be.an.instanceOf(Object);
    });

    it('should set the data-service attr to have a statusURL and no' +
      ' sidebar URL when running on a browser with statusPanel support',
      function() {
        sandbox.stub(node, "dispatchEvent");
        userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:28.0) " +
          "Gecko/20100101 Firefox/28.0";

        browserDetection.activateSocial(node, userAgent);

        var dataSvc = JSON.parse(node.getAttribute("data-service"));
        expect(dataSvc).to.have.ownProperty("statusURL");
        expect(dataSvc).to.not.have.ownProperty("sidebarURL");
      });

    it('should set the data-service attr to have a sidebarURL and no' +
      ' statusURL when running on a browser without statusPanel support',
      function() {
        sandbox.stub(node, "dispatchEvent");
        userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:25.0) " +
          "Gecko/20100101 Firefox/25.0";

        browserDetection.activateSocial(node, userAgent);

        var dataSvc = JSON.parse(node.getAttribute("data-service"));
        expect(dataSvc).to.not.have.ownProperty("statusURL");
        expect(dataSvc).to.have.ownProperty("sidebarURL");
      });


    it("should dispatch an ActivateSocialFeature event on the given node",
      function(done) {
        function handler() {
          done();
        }
        userAgent = navigator.userAgent;
        node.addEventListener("ActivateSocialFeature", handler);

        browserDetection.activateSocial(node, userAgent);
      });

  });

  describe("#isSupportedFirefox", function () {
    it("should return true when given a user agent string from Firefox 25",
      function() {
        userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:25.0) " +
          "Gecko/20100101 Firefox/25.0";

        expect(browserDetection.isSupportedFirefox(userAgent)).to.equal(true);
      });

    it("should return false when given a user-agent string from Firefox 24",
      function() {
        userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8;" +
          " rv:24.0) Gecko/20100101 Firefox/24.0";

        expect(browserDetection.isSupportedFirefox(userAgent)).to.equal(false);
      });

    it("should return false when given a user-agent string from Chrome 28",
      function() {
        userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5);" +
          " AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1650.57" +
          " Safari/537.36";

        expect(browserDetection.isSupportedFirefox(userAgent)).to.equal(false);
      }
    );
  });

  describe("#supportsStatusPanel", function () {

    it("should return true when given a user agent string from Firefox 28",
      function() {
        userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:28.0) " +
          "Gecko/20100101 Firefox/28.0";

        expect(browserDetection.supportsStatusPanel(userAgent)).to.equal(true);
      });

    it("should return false when given a user-agent string from Firefox 26",
      function() {
        userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:26.0) " +
          "Gecko/20100101 Firefox/26.0";

        expect(browserDetection.supportsStatusPanel(userAgent)).to.equal(false);
      });

    it("should return false when given a user-agent string from Chrome 28",
      function() {
        userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5);" +
          " AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1650.57" +
          " Safari/537.36";

        expect(browserDetection.supportsStatusPanel(userAgent)).to.equal(false);
      }
    );

  });

});
