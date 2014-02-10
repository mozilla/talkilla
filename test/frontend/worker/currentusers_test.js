/*global chai, CurrentUsers */
/* jshint expr:true */
"use strict";

var expect = chai.expect;

describe("CurrentUsers", function() {
  describe("#constructor", function() {
    it("should create an object", function() {
      expect(new CurrentUsers()).to.be.an("object");
    });
  });

  describe("constructed", function() {
    var users;

    beforeEach(function() {
      users = new CurrentUsers();
      users.set("jb", {username: "jb", presence: "disconnected"}, "email");
    });

    afterEach(function() {
      users.reset();
    });

    describe("#set", function() {
      it("should add a new user to the list", function() {
        users.set("niko");
        expect(users.has("niko")).eql(true);
      });

      it("should allow setting attributes when adding a new user", function() {
        users.set("niko", {presence: "connected"});
        expect(users.get("niko").presence).eql("connected");
      });

      it("should update an existing user attributes", function() {
        users.set("jb", {presence: "connected"});
        expect(users.get("jb").presence).eql("connected");
      });
    });

    describe("#get", function() {
      it("should retrieve an existing user", function() {
        expect(users.get("jb")).eql({
          username: "jb",
          email: "jb",
          presence: "disconnected"
        });
      });

      it("shouldn't retrieve a nonexistent user", function() {
        expect(users.get("bill")).to.be.a("undefined");
      });
    });

    describe("#getPresence", function() {
      it("should retrieve user presence information", function() {
        expect(users.getPresence("jb")).eql("disconnected");
      });

      it("should return a disconnected presence information for a " +
         "nonexistent user",
        function() {
          expect(users.getPresence("bill")).eql("disconnected");
        });
    });

    describe("#updateContacts", function() {
      var contacts;

      beforeEach(function() {
        contacts = [{email: "foo", phoneNumber: "123", fullName: "Mr Foo"}];
      });

      it("should add contacts to the users list", function() {
        users.updateContacts(contacts, "email");

        expect(users.all()).eql({
          jb: {
            email: "jb",
            username: "jb",
            presence: "disconnected"
          },
          foo: {
            email: "foo",
            username: "foo",
            fullName: "Mr Foo",
            phoneNumber: "123",
            presence: "disconnected",
            isContact: true
          }
        });
      });

      it("shouldn't duplicate contacts", function() {
        users.set('foo', {presence: "connected"}, "email");

        users.updateContacts(contacts, "email");

        expect(users.toArray()).to.have.length.of(2);
      });

      it("should add an isContact flag to each contact entry", function() {
        contacts.push({email: "bar"});

        users.updateContacts(contacts, "email");

        expect(contacts.every(function(contact) {
          return users.get(contact.email).isContact === true;
        })).eql(true);
      });
    });

    describe("#toArray", function() {
      it("should map current users dict as a list", function() {
        expect(users.toArray()).eql([{
          username: "jb",
          email: "jb",
          presence: "disconnected"
        }]);
      });

      it("should list users as contacts when user is a contact", function() {
        users = new CurrentUsers();
        users.set("foo", {
          email: "foo",
          presence: "connected",
          isContact: true
        }, "email");

        expect(users.toArray()).eql([{
          username: "foo",
          email: "foo",
          presence: "connected",
          isContact: true
        }]);
      });
    });
  });
});
