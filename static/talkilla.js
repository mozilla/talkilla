/* jshint unused: false */
/* XXX shouldn't need the unused above, ditch once we have Backbone/modules? */
function login() {
  var form = document.getElementById("login");
  var xhr = new XMLHttpRequest();
  xhr.onload = function() {
    if (this.status !== 200) {
      form.style.display = "";
      return;
    }
    var data = JSON.parse(this.responseText);
    document.getElementById("title").textContent = "Welcome " + data.nick + "!";
    if (!data.users.length) {
      document.getElementById("invite").style.display = "";
      return;
    }
    var ul = document.getElementById("friends");
    data.users.forEach(function(user) {
      var li = document.createElement("li");
      li.textContent = user;
      ul.appendChild(li);
    });
  };
  
  xhr.open("POST", "signin", true);
  xhr.send(new FormData(form));
  form.style.display = "none";
}
