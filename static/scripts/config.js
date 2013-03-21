require.config({
  deps: ['app'],
  baseUrl: 'scripts',
  paths: {
    text:       'lib/text',
    jquery:     'lib/jquery-1.9.1',
    underscore: 'lib/underscore',
    backbone:   'lib/backbone-1.0.0',
    handlebars: 'lib/handlebars',
    common:     'common',
  },
  shim: {
    'jquery': {
      exports: '$'
    },
    'underscore': {
      exports: '_'
    },
    'backbone': {
      deps: ['underscore', 'jquery'],
      exports: 'Backbone'
    },
    'handlebars': {
      exports: 'Handlebars'
    },
    'common': {
      exports: 'Common'
    }
  }
});
