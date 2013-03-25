/*global $, angular*/
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
      angular.element($('#loginForm')).toggleClass('hide');
      angular.element($('#userInfo')).toggleClass('hide');
      if (result.users.length === 1) {
        angular.element($('#invite')).removeClass('hide');
      }
    }).error(function() {
      alert('unable to sign in');
    });
  };
}
