HERE = $(shell pwd)
BIN = $(HERE)/bin
PYTHON = $(BIN)/python

INSTALL = $(BIN)/pip install --no-deps
VTENV_OPTS ?= --distribute -p `which python2.7 python2.6 | head -n 1`

BUILD_DIRS = bin build include lib lib64 man share


.PHONY: all test build

all: build

$(PYTHON):
	virtualenv $(VTENV_OPTS) .

build: $(PYTHON)
	$(BIN)/pip install -r test-requirements.txt

clean:
	rm -rf $(BUILD_DIRS)

test:
	$(BIN)/loads-runner test_talkilla.TestTalkilla.test_call

load:
	$(BIN)/loads-runner test_talkilla.TestTalkilla.test_call -u 100
