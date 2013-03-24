require.config({
  deps: ['app'],
  baseUrl: 'scripts',
  paths: {
    text:       'vendor/requirejs-text/text',
    jquery:     'vendor/jquery/jquery',
    underscore: 'vendor/underscore/underscore',
    backbone:   'vendor/backbone/backbone',
    handlebars: 'vendor/handlebars/handlebars',
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
