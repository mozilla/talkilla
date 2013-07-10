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

# XXX still need to make SOLO_FILE or equiv work with python; get rid of
# debug_test glop; maybe we can ditch NODE_ENV?

selenium_all:
  # This command should include the directories from both the selenium and frontend targets
	@env NO_LOCAL_CONFIG=true NODE_ENV=test \
	    bin/run_selenium_test.sh test/functional/test.py \
	    test/frontend/test_frontend.py

selenium:
	@env NO_LOCAL_CONFIG=true NODE_ENV=test \
    	bin/run_selenium_test.sh \
	    test/functional/test.py

# Useful when testing a single file by setting SOLO_FILE and putting
# debugger statement to force a breakpoint in the file you want to test.
# See README.md for more details.
#
debug_test:
	MOCHA_ARGS=debug $(MAKE) selenium

frontend:
	@env NO_LOCAL_CONFIG=true NODE_ENV=development bin/run_selenium_test.sh \
		test/frontend/test_frontend.py

.PHONY: test
