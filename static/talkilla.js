/*global angular*/
function AppController($scope, $http) {
  $scope.nick = 'guest';

  $http.get('/users').success(function(users) {
    $scope.users = users;
  }).error(function() {
    alert('unable to load users');
  });

  $scope.login = function() {
    $http.post('/signin', {nick: $scope.nick}).success(function(result) {
      $scope.users = result.users;
      angular.element(document.querySelector('#loginForm')).toggleClass('hide');
      angular.element(document.querySelector('#userInfo')).toggleClass('hide');
      if (result.users.length === 1) {
        angular.element(document.querySelector('#invite')).removeClass('hide');
      }
    }).error(function() {
      alert('unable to sign in');
    });
  };
}
