/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe("ImportContactsView", function() {
  var sandbox, user;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    $('body').append([
      '<div id="import-contacts">',
      '  <button>Load your contacts</button>',
      '</div>',
    ].join(''));
    user = new app.models.User();
  });

  afterEach(function() {
    sandbox.restore();
    $('#import-contacts').remove();
  });

  describe("#initialize", function() {
    beforeEach(function() {
      sandbox.stub(app.views.ImportContactsView.prototype, "render");
    });

    it("should require a user parameter", function() {
      expect(function() {
        new app.views.ImportContactsView({service: {}});
      }).to.Throw(/missing parameter: user/);

      expect(function() {
        new app.views.ImportContactsView({user: user});
      }).to.not.Throw(/missing parameter: user/);
    });

    it("should require a service parameter", function() {
      expect(function() {
        new app.views.ImportContactsView({user: user});
      }).to.Throw(/missing parameter: service/);

      expect(function() {
        new app.views.ImportContactsView({service: {}});
      }).to.not.Throw(/missing parameter: service/);
    });

    it("should render the view when the user signs in", function() {
      var importView = new app.views.ImportContactsView({
        user: user,
        service: {}
      });
      importView.render.reset();

      importView.user.trigger("signin");

      sinon.assert.calledOnce(importView.render);
    });

    it("should render the view when the user signs out", function() {
      var importView = new app.views.ImportContactsView({
        user: user,
        service: {}
      });
      importView.render.reset();

      importView.user.trigger("signout");

      sinon.assert.calledOnce(importView.render);
    });
  });

  describe("#loadGoogleContacts", function() {
    it("should start google contacts API authorization process", function() {
      var fakeService = {loadContacts: sinon.spy()};
      var importView = new app.views.ImportContactsView({
        user: user,
        service: fakeService
      });

      importView.loadGoogleContacts();

      sinon.assert.calledOnce(fakeService.loadContacts);
    });
  });

  describe("#render", function() {
    var importView, user;

    beforeEach(function() {
      user = new app.models.User();
      importView = new app.views.ImportContactsView({
        user: user,
        service: {}
      });
    });

    it("should be hidden by default", function() {
      expect(importView.render().$el.is(':visible')).to.equal(false);
    });

    it("should be displayed when user signs out", function() {
      user.set({nick: undefined, presence: "disconnected"}).trigger("signout");
      expect(importView.render().$el.is(':visible')).to.equal(false);
    });

    it("should be displayed when user signs in", function() {
      user.set({nick: "james", presence: "connected"}).trigger("signin");
      expect(importView.render().$el.is(':visible')).to.equal(true);
    });
  });
});
