/* global $, app, chai, describe, it, beforeEach, afterEach, sinon */

var expect = chai.expect;

describe("LoginView", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(app.views.LoginView.prototype, "render");
    $('body').append([
      '<div id="login">',
      '  <form id="signin"><input name="nick"></form>',
      '</div>'
    ].join(''));
  });

  afterEach(function() {
    sandbox.restore();
    $('#login').remove();
  });

  describe("#initialize", function() {
    it("should require a user parameter", function() {
      expect(function() {
        new app.views.LoginView();
      }).to.Throw(Error);

      expect(function() {
        new app.views.LoginView({user: new app.models.User()});
      }).to.not.Throw(Error);
    });

    it("should render the view when the user change", function() {
      var loginView = new app.views.LoginView({
        user: new app.models.User()
      });

      loginView.user.trigger("change");

      sinon.assert.calledOnce(loginView.render);
    });

    it("should render the view when the user is cleared", function() {
      var loginView = new app.views.LoginView({
        user: new app.models.User()
      });

      loginView.user.clear();

      sinon.assert.calledOnce(loginView.render);
    });
  });

  describe("signing in and out", function() {
    var loginView;

    beforeEach(function() {
      window.sidebarApp = {
        login: sandbox.spy(),
        logout: sandbox.spy()
      };
      loginView = new app.views.LoginView({user: new app.models.User()});
    });

    afterEach(function() {
      window.sidebarApp = undefined;
    });

    describe("#signin", function() {
      it("should call SidebarApp#login", function() {
        sandbox.stub(app.utils, "notifyUI");

        loginView.$("input").val("niko");
        loginView.$("form").trigger("submit");

        sinon.assert.calledOnce(window.sidebarApp.login);
        sinon.assert.calledWithExactly(window.sidebarApp.login, "niko");
      });

      it("should not call SidebarApp#login if nick is empty", function() {
        sandbox.stub(app.utils, "notifyUI");

        loginView.$("input").val("");
        loginView.$("form").trigger("submit");

        sinon.assert.notCalled(window.sidebarApp.login);
        sinon.assert.calledOnce(app.utils.notifyUI);
      });
    });

    describe("#signout", function() {
      it("should call SidebarApp#logout", function() {
        loginView.signout({preventDefault: function() {}});

        sinon.assert.calledOnce(window.sidebarApp.logout);
      });
    });
  });
});
