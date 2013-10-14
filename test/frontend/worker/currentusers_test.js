/*global chai, CurrentUsers */
/* jshint expr:true */

var expect = chai.expect;

describe("CurrentUsers", function() {
  describe("#constructor", function() {
    it("should create an object", function() {
      expect(new CurrentUsers()).to.be.an("object");
    });
  });

  describe("constructed", function() {
    var currentUsers;

    beforeEach(function() {
      currentUsers = new CurrentUsers();
      currentUsers.set("jb", {presence: "disconnected"});
    });

    afterEach(function() {
      currentUsers.reset();
    });

    describe("#set", function() {
      it("should add a new user to the list", function() {
        currentUsers.set("niko");
        expect(currentUsers.has("niko")).eql(true);
      });

      it("should allow setting attributes when adding a new user", function() {
        currentUsers.set("niko", {presence: "connected"});
        expect(currentUsers.get("niko").presence).eql("connected");
      });

      it("should update an existing user attributes", function() {
        currentUsers.set("jb", {presence: "connected"});
        expect(currentUsers.get("jb").presence).eql("connected");
      });
    });

    describe("#get", function() {
      it("should retrieve an existing user", function() {
        expect(currentUsers.get("jb")).eql({presence: "disconnected"});
      });

      it("shouldn't retrieve a nonexistent user", function() {
        expect(currentUsers.get("bill")).to.be.a("undefined");
      });
    });

    describe("#getPresence", function() {
      it("should retrieve user presence information", function() {
        expect(currentUsers.getPresence("jb")).eql("disconnected");
      });

      it("should return a disconnected presence information for a " +
         "nonexistent user",
        function() {
          expect(currentUsers.getPresence("bill")).eql("disconnected");
        });
    });

    describe("#updateContacts", function() {
      var contacts = [{username: "foo"}];

      it("should add contacts to the users list", function() {
        currentUsers.updateContacts(contacts);

        expect(currentUsers.all()).eql({
          jb: {presence: "disconnected"},
          foo: {presence: "disconnected"}
        });
      });

      it("shouldn't duplicate contacts", function() {
        currentUsers.set('foo', {presence: "connected"});

        currentUsers.updateContacts(contacts);

        expect(currentUsers.all()).eql({
          jb: {presence: "disconnected"},
          foo: {presence: "connected"}
        });
      });
    });
  });
});
