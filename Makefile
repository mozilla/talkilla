NODE_LOCAL_BIN=./node_modules/.bin
NODE_ENV?=development # by default we are in development mode
ifeq ($(shell echo ${NODE_ENV}), development)
SESSION_SECRET?=unguessable # default secret for development and test mode
endif

.PHONY: test
test: selenium-repeat

install:
	@npm install

.PHONY: lint
lint: jshint flake8

# bootstrap our python virtual environment if it's not there
.venv:
	virtualenv -p python2.7 `pwd`/.venv
	. .venv/bin/activate && pip install -r bin/require.pip

clean:
	rm -rf .venv node_modules

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
	@env NODE_ENV=test SESSION_SECRET=${SESSION_SECRET} \
		./node_modules/mocha/bin/mocha --reporter spec test/server

.PHONY: runserver
runserver:
	@env NODE_ENV=${NODE_ENV} PORT=5000 SESSION_SECRET=${SESSION_SECRET} \
		node app.js

.PHONY: runserver_dev
runserver_dev:
	@echo "Warning: make runserver_dev is deprecated, use runserver instead"
	make runserver

.PHONY: cover_server
cover_server:
	@env NODE_ENV=test SESSION_SECRET=${SESSION_SECRET}   \
		$(NODE_LOCAL_BIN)/istanbul cover        \
		$(NODE_LOCAL_BIN)/_mocha -- test/server
	@echo aim your browser at coverage/lcov-report/index.html for details

# XXX refactor this file to not invoke run_selenium_test.sh twice, and call
# other targets

.PHONY: selenium_all
selenium_all:
	bin/run_selenium_test.sh "python -m unittest discover -v test/frontend" \
		"python -m unittest discover -v test/functional"

.PHONY: selenium
selenium:
	bin/run_selenium_test.sh "python -m unittest discover -v test/functional"

.PHONY: selenium-repeat
REPEAT_TIMES ?= 3
REPEAT_TEST ?= -m unittest discover -v test/functional
selenium-repeat:
	FULL_SELENIUM_DEBUG=1 bin/run_selenium_test.sh "bin/repeat_loop.sh $(REPEAT_TIMES) python $(REPEAT_TEST)"

.PHONY: frontend
frontend:
	bin/run_selenium_test.sh "python -m unittest discover -v test/frontend"

PINPANEL_DIR ?= bin/PinPanel
PINPANEL_SRCS ?= $(PINPANEL_DIR)/install.rdf $(PINPANEL_DIR)/bootstrap.js
bin/PinPanel.xpi: $(PINPANEL_SRCS)
	rm -f bin/PinPanel.xpi
	( cd bin/PinPanel && zip ../PinPanel.xpi install.rdf bootstrap.js )

.PHONY: pinpanel
pinpanel: bin/PinPanel.xpi
