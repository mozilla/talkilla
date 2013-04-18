test: mocha jshint selenium

install:
	@npm install

jshint:
	@./node_modules/jshint/bin/jshint *.js static test

mocha:
  # Run tests in both production and development mode so that we can check
  # for any issues with the different configurations.
	@env NODE_ENV=development ./node_modules/mocha/bin/mocha --reporter spec
	@env NODE_ENV=production ./node_modules/mocha/bin/mocha --reporter spec

selenium:
	@env NODE_ENV=development ./node_modules/mocha/bin/mocha --reporter spec test/functional

setup_sauce_connect:
	# Used by the travis-ci configuration file
	bash test/functional/bin/sauce_connect_setup.sh

runserver:
	@env NODE_ENV=production PORT=5000 node app.js

runserver_dev:
	@env NODE_ENV=development PORT=5000 node app.js

.PHONY: test

