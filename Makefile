.PHONY: test
test: lint mocha selenium_all

install:
	@npm install

.PHONY: lint
lint: jshint flake8

# bootstrap our python virtual environment if it's not there
.venv:
	virtualenv `pwd`/.venv
	. .venv/bin/activate && pip install -r bin/require.pip

# flake8 is a python linter
PYTHON_SOURCES = test/functional/*.py test/frontend/*.py
.PHONY: flake8
flake8: .venv
	. .venv/bin/activate && flake8 $(PYTHON_SOURCES)

.PHONY: jshint
jshint:
	@./node_modules/jshint/bin/jshint *.js static server test

.PHONY: mocha
mocha:
  # Run tests in both production and development mode so that we can check
  # for any issues with the different configurations.
	@env NODE_ENV=development ./node_modules/mocha/bin/mocha --reporter spec
	@env NODE_ENV=production ./node_modules/mocha/bin/mocha --reporter spec

.PHONY: runserver
runserver:
	@env NODE_ENV=production PORT=5000 node app.js

.PHONY: runserver_dev
runserver_dev:
	@env NODE_ENV=development PORT=5000 node app.js

# XXX refactor this file to not invoke run_selenium_test.sh twice, and call
# other targets

.PHONY: selenium_all
selenium_all: frontend selenium

.PHONY: selenium
selenium:
	bin/run_selenium_test.sh -m unittest discover test/functional

.PHONY: frontend
frontend:
	bin/run_selenium_test.sh -m unittest discover test/frontend

