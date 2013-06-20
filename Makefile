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

selenium_all:
  # This command should include the directories from both the selenium and frontend targets
	@env NO_LOCAL_CONFIG=true NODE_ENV=test bin/run_selenium_test.sh test/functional/ test/frontend/run_tests.js

selenium:
	@env NO_LOCAL_CONFIG=true NODE_ENV=test bin/run_selenium_test.sh $(MOCHA_ARGS) test/functional/$(SOLO_FILE)

# Useful for running mocha (and thus node) in debug mode so that the NodeJS
# command line debugger can be used to debug webdriver-selenium functional
# tests.  Example usage:
#
# (add a "debugger;" statement to the code where you want the debugger to break)
# SOLO_FILE=chatwindow_test.js make debug_test
# (debug)
# (remove the debugger statement)
#
# Note that because most of the things in the webdriver-selenium API that
# look like imperative statements are actually magic things that cause most
# of the semantics of the commands be enqueued by the ControlFlow piece of
# the "promise manager" to be executed at some point in the future. It can
# take some experimenting to figure out where to usefully put the debugger
# statements.  It may be particularly useful to add a then() handler to the
# first promise-returning statement in the test you want to debug and put
# the debugger statement there.
#
# https://code.google.com/p/selenium/wiki/WebDriverJs#Writing_Tests has details
# of the various promise bits.
#
debug_test:
	MOCHA_ARGS=debug $(MAKE) selenium

frontend:
	@env NO_LOCAL_CONFIG=true NODE_ENV=development bin/run_selenium_test.sh test/frontend/run_tests.js

.PHONY: test
