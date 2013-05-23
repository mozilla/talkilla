/* jshint unused:false */
/**
 * Initializes a fake mozSocial object for tests.
 */
function initMozSocial(obj) {
  if (!('mozSocial' in navigator)) {
    navigator.mozSocial = obj;
  }
}
