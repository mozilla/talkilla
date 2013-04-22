#!/bin/bash

# Setup and start Sauce Connect for your TravisCI build
# This script requires your .travis.yml to include the following two private env variables:
# SAUCE_USERNAME
# SAUCE_ACCESS_KEY
# Follow the steps at https://saucelabs.com/opensource/travis to set that up.

CONNECT_URL="http://saucelabs.com/downloads/Sauce-Connect-latest.zip"
CONNECT_DIR="/tmp/sauce-connect-$RANDOM"
CONNECT_DOWNLOAD="Sauce_Connect.zip"
READY_FILE="connect-ready-$RANDOM"

# Get Connect
if [ ! -f Sauce-Connect.jar ]
then
    mkdir -p $CONNECT_DIR
    cd $CONNECT_DIR
    curl $CONNECT_URL > $CONNECT_DOWNLOAD
    unzip $CONNECT_DOWNLOAD
    rm $CONNECT_DOWNLOAD
fi

# Creds checks
: ${SAUCE_USERNAME:?"SAUCE_USERNAME is required"}
: ${SAUCE_ACCESS_KEY:?"SAUCE_ACCESS_KEY is required"}

# Run Connect
java -jar Sauce-Connect.jar --readyfile $READY_FILE \
                            $SAUCE_USERNAME \
                            $SAUCE_ACCESS_KEY &

# Wait for Connect to be ready before exiting
while [ ! -f $READY_FILE ]; do
  sleep .5
done
