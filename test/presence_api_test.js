var expect = require('chai').expect;
var request = require('request');
var server = require('../server').server;

var connection;

describe('Server', function() {
  describe('presence', function() {

    beforeEach(function() {
      connection = server.listen(3000);
    });

    afterEach(function() {
      connection.close();
    });

    it('should have no users logged in', function() {
      expect(server.get('users')).to.be.empty;
    });

    it('should have foo logged in', function(done) {
      request.post('http://localhost:3000/signin', {form: {nick: 'foo'}}, function() {
        expect(server.get('users')).to.eql(['foo']);
        done();
      });
    });

    it('should have no users logged in', function(done) {
      request.post('http://localhost:3000/signin', {form: {nick: 'foo'}}, function() {
        request.post('http://localhost:3000/signout', {form: {nick: 'foo'}}, function() {
          expect(server.get('users')).to.be.empty;
          done();
        });
      });
    });
  });
});

