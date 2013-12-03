/*global sinon, HTTP */
"use strict";

describe("HTTP", function() {
  var sandbox, http;

  beforeEach(function () {
    http = new HTTP();
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe("With XmlHttpRequest stubbed to timeout", function() {
    beforeEach(function () {
      sandbox.stub(XMLHttpRequest.prototype, "send", function() {
        this.ontimeout({});
      });
    });

    describe("#request", function() {
      it("Should execute the callback when the request times out.", function() {
        var callback = sinon.spy();

        http.request("GET", "/stream", {firstRequest: true, timeout: 1},
                     callback);

        sinon.assert.calledOnce(callback);
        sinon.assert.calledWithExactly(callback, 0, "We are offline");
      });
    });
  });

  describe("With useFakeXMLHttpRequest", function (){
    var xhr, request, callback;

    beforeEach(function () {
      xhr = sinon.useFakeXMLHttpRequest();
      xhr.onCreate = function (xhrRequest) {
        request = xhrRequest;
      };

      callback = sinon.spy();
      http.request("POST", "/somewhere", {some: "data"}, callback);
    });

    describe("#request", function() {
      it("should execute the callback with success for 200 responses",
        function() {
          request.respond(200, {}, "OK Response");

          sinon.assert.calledOnce(callback);
          sinon.assert.calledWithExactly(callback,
                                         null,
                                         "OK Response");
        });

      it("should execute the callback with success for 204 responses",
        function() {
          request.respond(204, {});

          sinon.assert.calledOnce(callback);
          sinon.assert.calledWithExactly(callback,
                                         null,
                                         "");
        });

      it("should execute the callback with an error AND the response body",
        function() {
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
});
