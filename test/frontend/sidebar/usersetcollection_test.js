/*global app, chai */
"use strict";

var expect = chai.expect;

describe("UserSet Collection", function() {

  it("should order username by default", function() {
    var collection = new app.models.UserSet();
    collection.add([{username:'jill'}, {username:'bill'}, {username:'bob'}]);
    expect(collection.at(0).get('username')).to.equal('bill');
    expect(collection.at(1).get('username')).to.equal('bob');
    expect(collection.at(2).get('username')).to.equal('jill');
  });

});
