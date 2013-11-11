/*global chai, sinon, browserDetection */
var expect = chai.expect;

describe("browserDetection.app", function() {
  "use strict";

  var sandbox;
  var el;
  var node;
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

      browserDetection.activateSocial(node);

      var dataSvc = JSON.parse(node.getAttribute("data-service"));
      expect(dataSvc).to.be.an.instanceOf(Object);
    });


    it('should set the data-service attribute to include a statusURL',
      function() {
        sandbox.stub(node, "dispatchEvent");

        browserDetection.activateSocial(node);

        var dataSvc = JSON.parse(node.getAttribute("data-service"));
        expect(dataSvc).to.have.ownProperty("statusURL");
      });


    it("should dispatch an ActivateSocialFeature event on the given node",
      function(done) {
        function handler() {
          done();
        }

        node.addEventListener("ActivateSocialFeature", handler);

        browserDetection.activateSocial(node);
      });

  });
});
