/*global sinon, HTTP */

describe('HTTP', function() {
  "use strict";
  var sandbox, http, xhr, request;

  beforeEach(function () {
    http = new HTTP();
    sandbox = sinon.sandbox.create();
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function (xhrRequest) {
      request = xhrRequest;
    };
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe("#request", function() {
    it("should execute the callback with an error AND the response body",
      function() {
        var callback = sinon.spy();
        http.request("POST", "/somewhere", {some: "data"}, callback);

        request.respond(400, {}, "response body");

        sinon.assert.calledOnce(callback);
        sinon.assert.calledWithExactly(callback,
                                       request.status,
                                       "response body");
      });
  });

  describe("#get", function() {
    it("should perform a GET request", function() {
      var cb = function() {};
      sandbox.stub(http, "request");

      http.get("/somewhere", {foo: "bar"}, cb);

      sinon.assert.calledOnce(http.request);
      sinon.assert.calledWithExactly(http.request,
        "GET", "/somewhere", {foo: "bar"}, cb);
    });
  });

  describe("#post", function() {
    it("should perform a POST request", function() {
      var cb = function() {};
      sandbox.stub(http, "request");

      http.post("/somewhere", {foo: "bar"}, cb);

      sinon.assert.calledOnce(http.request);
      sinon.assert.calledWithExactly(http.request,
        "POST", "/somewhere", {foo: "bar"}, cb);
    });
  });
});
