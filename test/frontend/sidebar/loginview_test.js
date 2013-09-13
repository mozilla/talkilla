/*global app, chai, sinon */

var expect = chai.expect;

describe("LoginView", function() {
  var sandbox;

  beforeEach(function() {
    // BrowserId "mock"
    window.navigator.id = {
      watch: sinon.spy(),
      request: sinon.spy(),
      logout: sinon.spy()
    };

    sandbox = sinon.sandbox.create();
    $('body').append([
      '<div id="login">',
      '  <form id="signin" class="hide"><input name="nick"></form>',
      '  <form id="signout" class="hide"></form>',
      '</div>',
    ].join(''));
  });

  afterEach(function() {
    sandbox.restore();
    $('#login').remove();
  });

  describe("#initialize", function() {
    beforeEach(function() {
      sandbox.stub(app.views.LoginView.prototype, "render");
    });

    it("should require a user parameter", function() {
      expect(function() {
        new app.views.LoginView();
      }).to.Throw(Error);

      expect(function() {
        new app.views.LoginView({user: new app.models.User()});
      }).to.not.Throw(Error);
    });

    it("should render the view", function() {
      var loginView = new app.views.LoginView({
        user: new app.models.User()
      });

      sinon.assert.calledOnce(loginView.render);
    });

    it("should render the view when the user change", function() {
      var loginView = new app.views.LoginView({
        user: new app.models.User()
      });

      loginView.render.reset();

      loginView.user.trigger("change");

      sinon.assert.calledOnce(loginView.render);
    });

    it("should render the view when the user is cleared", function() {
      var loginView = new app.views.LoginView({
        user: new app.models.User()
      });

      loginView.render.reset();

      loginView.user.clear();

      sinon.assert.calledOnce(loginView.render);
    });
  });

  describe("#render", function() {
    var loginView, user;

    beforeEach(function() {
      user = new app.models.User();
      loginView = new app.views.LoginView({user: user});
    });

    it("should display signin and hide signout when there is not a nick",
      function() {
        loginView.render();

        expect(loginView.$('#signin').is(':visible')).to.equal(true);
        expect(loginView.$('#signout').is(':visible')).to.equal(false);
      });

    it("should hide signin and display signout when there is not a nick",
      function() {
        user.set("nick", "james");
        loginView.render();

        expect(loginView.$('#signin').is(':visible')).to.equal(false);
        expect(loginView.$('#signout').is(':visible')).to.equal(true);
      });
  });

  describe("signing in and out", function() {
    var loginView;
    var clickEvent = {preventDefault: function() {}};

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

      it("should call navigator.id.request", function() {
        sandbox.stub(app.utils, "notifyUI");

        loginView.signin(clickEvent);

        sinon.assert.calledOnce(window.navigator.id.request);
      });

    });

    describe("#signout", function() {

      it("should call SidebarApp#logout", function() {
        loginView.signout(clickEvent);

        sinon.assert.calledOnce(window.navigator.id.logout);
      });

    });
  });
});
