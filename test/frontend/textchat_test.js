/* global describe, it, chai, app */
var expect = chai.expect;

describe("app.models.TextChatEntry", function() {
  "use strict";

  it("should be initialized with defaults", function() {
    var entry = new app.models.TextChatEntry();
    expect(entry.get("nick")).to.be.a("undefined");
    expect(entry.get("message")).to.be.a("undefined");
    expect(entry.get("date")).to.be.a("number");
  });
});

describe("app.models.TextChat", function() {
  "use strict";

  it("should be empty by default", function() {
    var textChat = new app.models.TextChat();
    expect(textChat).to.have.length.of(0);
    textChat.add({nick: "jb", message: "hi"});
    expect(textChat).to.have.length.of(1);
  });

  it("should listen to the talkilla.text-message event and update accordingly",
    function(done) {
      var textChat = new app.models.TextChat();
      textChat.on("add", function() {
        expect(textChat).to.have.length.of(1);
        done();
      });
      app.port.trigger('talkilla.text-message', {
        nick: "jb",
        message: "wake up!",
        date: new Date().getTime()
      });
    });

});
