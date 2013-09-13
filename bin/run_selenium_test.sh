#!/bin/bash

DIR=`dirname $0`

set -x

$DIR/selenium.sh start

# activate sets up the python virtual environment, and does a lot of stuff
# so we turn off command echoing while it's sourcing
set +x
. ./.venv/bin/activate
set -x

$@
RESULT=$?
$DIR/selenium.sh stop

set +x

echo "----- Browser console log output -----"
cat firefox.log

exit $RESULT
