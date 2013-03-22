require.config({
  deps: ['app'],
  baseUrl: 'scripts',
  paths: {
    text:       'vendor/text',
    jquery:     'vendor/jquery-1.9.1',
    underscore: 'vendor/underscore',
    backbone:   'vendor/backbone-1.0.0',
    handlebars: 'vendor/handlebars',
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
