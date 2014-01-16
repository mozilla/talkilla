/*global app, chai */

describe("LinkShareView", function ()  {
  "use strict";

  var expect = chai.expect;

  describe("#render", function() {
    var linkShareView, username, user;

    beforeEach(function() {
      $('#fixtures').append('<div id="link-share"></div>');

      username = "rt@example.com";
      user = new app.models.CurrentUser({
        username: username,
        presence: "connected"
      });
      linkShareView = new app.views.LinkShareView({user: user});
    });

    afterEach(function() {
      $('#fixtures').empty();
    });

    it("should return itself to allow chained calls", function() {
      expect(linkShareView.render()).to.equal(linkShareView);
    });

    it("should render a url input with a link-share-input id",
      function () {
        linkShareView.render();

        var $textFormEl = $("#fixtures").find('#link-share-input');
        expect($textFormEl.length).to.equal(1);
        expect($textFormEl.prop('tagName').toLowerCase()).to.equal('input');
        expect($textFormEl.prop('type')).to.equal('url');
      });

    it("should render a label for the input field", function () {
      linkShareView.render();

      var $labelEl = $("#fixtures").find('.link-share-label');
      expect($labelEl.length).to.equal(1);
      expect($labelEl.prop('tagName').toLowerCase()).to.equal('label');
      expect($labelEl.attr('for')).to.equal("link-share-input");
    });

    it("should render a copy button of class link-copy-button", function () {
      linkShareView.render();

      var $copyButtonEl = $("#fixtures").find(".link-copy-button");
      expect($copyButtonEl.length).to.equal(1);
      expect($copyButtonEl.prop('tagName').toLowerCase()).to.equal('button');
    });

    // XXX this is the easiest way to get started: handle only the logged in
    // case, and use the username as part of the URL.  Something like:
    //
    // http://talkilla.mozillalabs.com/instant-share/?username=joe%40example.com
    //
    // This will all change later, but it's the fastest way to move forward.

    it("should offer a valid default URL to chat", function() {
      linkShareView.render();

      var inputEl = $("#fixtures").find("#link-share-input").get()[0];

      expect(inputEl.validity.valid).to.equal(true);
    });

    it("the URL should start with window.location.origin + /instant-share/",
      function() {
        linkShareView.render();
        var expectedURLRegex =
          new RegExp("^" + window.location.origin + "/instant-share/");

        var inputEl = $("#fixtures").find("#link-share-input").get()[0];

        expect(inputEl.value).to.match(expectedURLRegex);
      });

    it("the URL should end with a URI-encoded version of the email address",
      function() {
        linkShareView.render();
        var expectedURLRegex =
          new RegExp(encodeURIComponent(username) + "$");

        var inputEl = $("#fixtures").find("#link-share-input").get()[0];

        expect(inputEl.value).to.match(expectedURLRegex);
      });

    it("should not render when the user is not logged in");

  });

});
