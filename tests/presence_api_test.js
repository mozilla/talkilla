var expect = require('chai').expect;
var request = require('request');
var server = require('../server').server;

describe('Server', function() {
  describe('presence', function() {

    it('should have no users logged in', function() {
      server.listen(3000)
      expect(server.get('users')).to.be.empty;
    });

    it('should have foo logged in', function(done) {
      request.post('http://localhost:3000/signin', {form: {nick: 'foo'}}, function() {
        expect(server.get('users')).to.eql(['foo'])
        done();
      });
    });
  });
});

