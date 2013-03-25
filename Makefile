test: mocha jshint

mocha:
	@./node_modules/mocha/bin/mocha --reporter spec

jshint:
	@jshint *.js static test

.PHONY: test
