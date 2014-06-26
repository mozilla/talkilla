#!/bin/bash

FIREFOX_NIGHTLY_BZIP2_FILENAME="firefox-30.0a1.en-US.linux-x86_64.tar.bz2"
FIREFOX_NIGHTLY_BZIP2_URL="http://ftp.mozilla.org/pub/mozilla.org/firefox/nightly/latest-mozilla-central/$FIREFOX_NIGHTLY_BZIP2_FILENAME"

FIREFOX_RELEASE_BZIP2_FILENAME="firefox-27.0.tar.bz2"
FIREFOX_RELEASE_BZIP2_URL="http://ftp.mozilla.org/pub/mozilla.org/firefox/releases/latest/linux-x86_64/en-US/$FIREFOX_RELEASE_BZIP2_FILENAME"

if [ "$RELEASE_FIREFOX" == "1" ]; then
    FIREFOX_BZIP2_FILENAME=$FIREFOX_RELEASE_BZIP2_FILENAME
    FIREFOX_BZIP2_URL=$FIREFOX_RELEASE_BZIP2_URL
else
    FIREFOX_BZIP2_FILENAME=$FIREFOX_NIGHTLY_BZIP2_FILENAME
    FIREFOX_BZIP2_URL=$FIREFOX_NIGHTLY_BZIP2_URL
fi

SELENIUM_JAR_FILENAME="selenium-server-standalone-2.35.0d.jar"
SELENIUM_JAR_URL="http://ftp.mozilla.org/pub/mozilla.org/webtools/selenium/socialapi/$SELENIUM_JAR_FILENAME"
PWD=`pwd`

function getSeleniumPid() {
  SELENIUM_PID=`ps -eo pid,args | grep $SELENIUM_JAR_FILENAME | grep -v grep | awk '{print $1}'`
}
# Initialise for first time around.
getSeleniumPid

if [[ "$(uname)" == "Linux" && -z "$DISABLE_XVFB" ]]; then
    echo "Running the tests in a virtual frame buffer."
    XVFB="xvfb-run"
fi

function getXVFBPid() {
  XVFB_PID=`ps -eo pid,args | grep $XVFB | grep -v grep | awk '{print $1}'`
}
# Initialise for first time around.
getXVFBPid

install() {
    if [ ! -f $SELENIUM_JAR_FILENAME ]; then
        echo "Downloading $SELENIUM_JAR_URL"
        curl $SELENIUM_JAR_URL > $SELENIUM_JAR_FILENAME
        echo "Selenium server install in $SELENIUM_JAR_FILENAME"
    fi

    if [[ (`uname` != "Darwin") && (!(-e /usr/bin/firefox-nightly))]]; then
        if [ ! -f $FIREFOX_BZIP2_FILENAME ]; then
            echo "Downloading $FIREFOX_BZIP2_URL"
            curl $FIREFOX_BZIP2_URL > $FIREFOX_BZIP2_FILENAME
        fi
        if [ -e firefox ]; then
          rm -rf firefox
        fi
        echo "Unpacking $FIREFOX_BZIP2_FILENAME"
        tar -xjf $FIREFOX_BZIP2_FILENAME
        echo "Done."
    fi
    bootstrap_python
}

bootstrap_python() {
    if [ ! -d  .venv ]; then
        echo "Bootstrapping functional testing dependencies"
        virtualenv `pwd`/.venv
        . .venv/bin/activate
        pip install -r bin/require.pip
    fi
}

start() {
    if [ "$SELENIUM_PID" != "" ]; then
        echo "Selenium server is already running (pid=$SELENIUM_PID)"
        exit 1
    fi

    # options are listed at http://code.google.com/p/selenium/wiki/FirefoxDriver
    if [ $FULL_SELENIUM_DEBUG ]; then
      $XVFB java -jar $SELENIUM_JAR_FILENAME -Dwebdriver.firefox.bin=$PWD/bin/firefox -Dwebdriver.log.file=$PWD/console.log -Dwebdriver.firefox.logfile=/dev/stdout &
    else
      $XVFB java -jar $SELENIUM_JAR_FILENAME -Dwebdriver.firefox.bin=$PWD/bin/firefox -Dwebdriver.log.file=$PWD/console.log -Dwebdriver.firefox.logfile=$PWD/firefox.log &>/dev/null &
    fi
    CODE="000"
    while [ $CODE != "200" ]; do
        CODE=$(curl -sL -w "%{http_code}" http://localhost:4444/wd/hub -o /dev/null)
        sleep 0.1
    done
    echo "Selenium server started ($SELENIUM_JAR_FILENAME)"
}

stop() {
    if [ "$SELENIUM_PID" = "" ]; then
        echo "Selenium server not running"
        exit 1
    fi

    echo "Stopping Selenium server..."
    kill -15 $SELENIUM_PID

    # Ensure the server has fully stopped, for cases where we run two commands together,
    # e.g. travis.
    getSeleniumPid

    while [ "$SELENIUM_PID" != "" ]; do
      sleep 0.5
      getSeleniumPid
    done
    echo "Selenium server stopped"

    if [ "$XVFB_PID" != "" ]; then
        echo "Stopping XVFB"
        kill -15 $XVFB_PID

        getXVFBPid

        while [ "$XVFB_PID" != "" ]; do
          sleep 0.5
          getXVFBPid
        done

        echo "XVFB stopped"
    fi
}

case "$1" in
    install)
        install
        ;;
    start)
        install
        start
        ;;
    stop)
        stop
        ;;
    restart|reload)
        stop
        start
        ;;
    *)
        echo $"Usage: $0 {install|start|stop|restart|reload}"
        exit 1
esac

exit 0
