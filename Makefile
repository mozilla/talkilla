test: jshint mocha selenium_all

install:
	@npm install

jshint:
	@./node_modules/jshint/bin/jshint *.js static test

mocha:
  # Run tests in both production and development mode so that we can check
  # for any issues with the different configurations.
	@env NODE_ENV=development ./node_modules/mocha/bin/mocha --reporter spec
	@env NODE_ENV=production ./node_modules/mocha/bin/mocha --reporter spec

runserver:
	@env NODE_ENV=production PORT=5000 node app.js

runserver_dev:
	@env NODE_ENV=development PORT=5000 node app.js

# XXX refactor this file to not invoke run_selenium_test.sh twice, and call
# other targets

selenium_all:
  # This command should include the directories from both the selenium and frontend targets
	@env NO_LOCAL_CONFIG=true NODE_ENV=test \
	    bin/run_selenium_test.sh -m unittest discover test/functional
	@env NO_LOCAL_CONFIG=true NODE_ENV=test \
	    bin/run_selenium_test.sh test/frontend/frontend_all_units_test.py

selenium:
	@env NO_LOCAL_CONFIG=true NODE_ENV=test \
    	bin/run_selenium_test.sh \
	    test/functional/test.py

frontend:
	@env NO_LOCAL_CONFIG=true NODE_ENV=development bin/run_selenium_test.sh \
		test/frontend/frontend_all_units_test.py

.PHONY: test
