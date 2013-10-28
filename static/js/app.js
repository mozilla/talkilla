/* global payloads */
/**
 * Talkilla application object. The global exposed object is mostly a namespace
 * container.
 *
 * @type {Object}
 */
window.app = {
  // default options
  options: {},

  // app modules
  data: {},
  models: {},
  port: {},
  media: {},
  views: {},
  utils: {},
  payloads: payloads,

  start: function(options) {
    _.extend(this.options, options || {});
  }
};
