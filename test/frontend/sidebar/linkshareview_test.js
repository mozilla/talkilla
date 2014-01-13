/*global app, chai */

describe("LinkShareView", function ()  {
  "use strict";

  var expect = chai.expect;

  describe("#render", function() {
    beforeEach(function() {
      $('#fixtures').append('<div id="link-share"></div>');
    });

    afterEach(function() {
      $('#fixtures').empty();
    });

    it("should render an input form", function () {
      var linkShareView = new app.views.LinkShareView();

      linkShareView.render();

      expect($('#fixtures').find('.link-share-input').length).to.equal(1);
    });

  });

});
