/* global app, $, describe, it, chai, beforeEach, afterEach */
/* jshint unused:vars */
var expect = chai.expect;

describe('Text chat', function() {
  "use strict";

  describe("app.models.TextChatEntry", function() {
    it("should be initialized with defaults", function() {
      var entry = new app.models.TextChatEntry();
      expect(entry.get("nick")).to.be.a("undefined");
      expect(entry.get("message")).to.be.a("undefined");
      expect(entry.get("date")).to.be.a("number");
    });
  });

  describe("app.models.TextChat", function() {
    it("should be empty by default", function() {
      var textChat = new app.models.TextChat();
      expect(textChat).to.have.length.of(0);
      textChat.add({nick: "jb", message: "hi"});
      expect(textChat).to.have.length.of(1);
    });

    it("should listen to data channels events and update accordingly");
  });

  describe('app.views.TextChatView', function() {
    beforeEach(function() {
      $('body').append('<div id="textchat"><dl></dl></div>');
    });

    afterEach(function() {
      $('#textchat').remove();
    });

    it("should be empty by default", function() {
      var view = new app.views.TextChatView({
        collection: new app.models.TextChat()
      });
      expect(view.collection).to.have.length.of(0);
      view.render();
      expect(view.$('dl').html()).to.equal('');
    });

    it("should update rendering when its collection is updated", function() {
      var view = new app.views.TextChatView({
        collection: new app.models.TextChat([
          {nick: "niko", message: "plop"},
          {nick: "jb", message: "hello"}
        ])
      });
      expect(view.collection).to.have.length.of(2);
      view.render();
      expect(view.$('dl dt')).to.have.length.of(2);
      // add a new message to the conversation
      view.collection.add({nick: "niko", message: "how is it going?"});
      expect(view.collection).to.have.length.of(3);
      expect(view.$('dl dt')).to.have.length.of(3);
    });
  });
});
