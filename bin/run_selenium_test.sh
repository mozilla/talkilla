#!/bin/bash

DIR=`dirname $0`

set -x

$DIR/selenium.sh start
# ./node_modules/mocha/bin/mocha $@ --reporter spec

# activate sets up the python virtual environment, and does a lot of stuff
# so we turn off command echoing while it's sourcing
set +x
. ./.venv/bin/activate
set -x

python test/functional/test.py
RESULT=$?
$DIR/selenium.sh stop

set +x

exit $RESULT
