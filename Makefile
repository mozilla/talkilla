test: mocha jshint

install:
	@npm install

jshint:
	@./node_modules/jshint/bin/jshint *.js static test

mocha:
	@env NODE_ENV=production ./node_modules/mocha/bin/mocha --reporter spec
	@env NODE_ENV=development ./node_modules/mocha/bin/mocha --reporter spec

runserver:
	@env NODE_ENV=production PORT=5000 node app.js

runserver_dev:
	@env NODE_ENV=development PORT=5000 node app.js

.PHONY: test

