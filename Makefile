test: mocha jshint

install:
	@npm install

jshint:
	@./node_modules/jshint/bin/jshint *.js static test

mocha:
	@./node_modules/mocha/bin/mocha --reporter spec

runserver:
	@env PORT=5000 node app.js

.PHONY: test

