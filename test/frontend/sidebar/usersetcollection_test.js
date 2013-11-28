/*global app, chai */
"use strict";

var expect = chai.expect;

describe("UserSet Collection", function() {

  it("should order nick by default", function() {
    var collection = new app.models.UserSet();
    collection.add([{nick:'jill'}, {nick:'bill'}, {nick:'bob'}]);
    expect(collection.at(0).get('nick')).to.equal('bill');
    expect(collection.at(1).get('nick')).to.equal('bob');
    expect(collection.at(2).get('nick')).to.equal('jill');
  });

});
