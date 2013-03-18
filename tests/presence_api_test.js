var expect = require('chai').expect;
var request = require('request');
var server = require('../server').server;

describe('Server', function() {
  describe('presence', function() {

    it('should have no users logged in', function() {
      server.listen(3000)
      expect(server.get('users')).to.be.empty;
    });

  });
});

