test: mocha jshint

install:
	@npm install

jshint:
	@./node_modules/jshint/bin/jshint *.js static test

mocha:
	@./node_modules/mocha/bin/mocha --reporter spec

runserver:
	@env NODE_ENV=prod PORT=5000 node app.js

runserver_dev:
	@env NODE_ENV=dev PORT=5000 node app.js

.PHONY: test

