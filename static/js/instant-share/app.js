/* global HTTP */

"use strict";

document.querySelector("#instant-share-call a")
  .addEventListener("click", function() {
    var http = new HTTP();
    http.post(window.location, {});
  });