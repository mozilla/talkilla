#!/bin/bash

DIR=`dirname $0`

set -x

$DIR/selenium.sh start
./node_modules/mocha/bin/mocha $1 --reporter spec
RESULT=$?
$DIR/selenium.sh stop

set +x

exit $RESULT
