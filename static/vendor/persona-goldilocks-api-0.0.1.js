(function () {
  /* License: MPL 2.0.
   *
   * This polyfill implements the proposed "Goldilocks API" for Persona atop the
   * existing "Observer API."
   *
   * Usage:
   * 1. Configure Persona:
   *
   *     navigator.id.watch({
   *       onlogin: function (assertion) {
   *         // POST the assertion to your backend for verification.
   *         // Log the user in if valid.
   *       }
   *     });
   *
   * 2. When the user clicks your login button, prompt them to log in:
   *
   *     navigator.id.request();
   *
   * Done!
   */

  var watch = navigator.id.watch;

  navigator.id.watch = function(args) {
    try {
      // Always try to work without this polyfill, first.
      watch.apply(navigator.id, [args, ]);
    } catch (e) {
      // Disable legacy .watch() parameters:
      if ('onlogout' in args || 'onready' in args || 'loggedInUser' in args) {
        throw "Unknown paramter passed to navigator.id.watch().";
      }

      // Disable legacy Persona functions, storing a reference to logout:
      var logout = navigator.id.logout;
      navigator.id.getVerifiedEmail = undefined;
      navigator.id.get = undefined;
      navigator.id.logout = undefined;

      // We never expect our user to have a Persona-managed session. This
      // suppresses automatic calls to onlogout by the Observer API.
      args.loggedInUser = null;

      // We're going to do something really hacky to make sure that the user is
      // always "logged out" in the eyes of the Observer API: We'll always
      // invoke navigator.id.logout() before running the real login callback.
      //
      // To avoid race conditions with asynchronous XHR requests, we repurpose
      // the logout callback to *actually* log the user into the site, after it
      // finishes clearing their Persona-managed state.
      //
      // For this to be possible, we have to pass the assertion up into this
      // closure so that the logout callback can see it.
      var onlogin = args.onlogin;
      var assertion;

      args.onlogout = function () {
        onlogin(assertion);
      };

      args.onlogin = function (_assertion) {
        assertion = _assertion;
        logout.apply(navigator.id);
      };

      // Hooray! The Observer API should now behave like Goldilocks!
      watch.apply(navigator.id, [args, ]);
    }
  };
})();