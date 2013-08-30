NODE_LOCAL_BIN=./node_modules/.bin

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
	@$(NODE_LOCAL_BIN)/jshint *.js static server test

.PHONY: mocha
mocha:
	@env NODE_ENV=test ./node_modules/mocha/bin/mocha \
		--reporter spec test/server

.PHONY: runserver
runserver:
	@env NODE_ENV=production PORT=5000 node app.js

.PHONY: runserver_dev
runserver_dev:
	@env NODE_ENV=development PORT=5000 node app.js

.PHONY: cover_server
cover_server:
	@env NODE_ENV=development $(NODE_LOCAL_BIN)/istanbul cover \
		$(NODE_LOCAL_BIN)/_mocha -- test/server
	@echo aim your browser at coverage/lcov-report/index.html for details

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

