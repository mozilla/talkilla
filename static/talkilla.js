function AppController($scope, $http) {
  $scope.nick = 'guest';

  $http.get('/users').success(function(users) {
    $scope.users = users;
  });

  $scope.login = function() {
    $http.post('/signin', {nick: $scope.nick}).success(function(result) {
      $scope.users = result.users;
    });
  };
}
