#!/bin/bash

FIREFOX_BZIP2_FILENAME="firefox-28.0a1.en-US.linux-x86_64.tar.bz2"
FIREFOX_BZIP2_URL="http://ftp.mozilla.org/pub/mozilla.org/firefox/nightly/2013-11-26-05-20-50-mozilla-central/$FIREFOX_BZIP2_FILENAME"
SELENIUM_JAR_FILENAME="selenium-server-standalone-2.35.0b.jar"
SELENIUM_JAR_URL="http://ftp.mozilla.org/pub/mozilla.org/webtools/selenium/socialapi/$SELENIUM_JAR_FILENAME"
SELENIUM_PID_FILE="/tmp/selenium-server-pid"
PWD=`pwd`

install() {
    if [ ! -f $SELENIUM_JAR_FILENAME ]; then
        echo "Downloading $SELENIUM_JAR_URL"
        curl $SELENIUM_JAR_URL > $SELENIUM_JAR_FILENAME
        echo "Selenium server install in $SELENIUM_JAR_FILENAME"
    fi
    if [[ (`uname` != "Darwin") && (!(-e /usr/bin/firefox-nightly)) && (! -f $FIREFOX_BZIP2_FILENAME) ]]; then
        echo "Downloading $FIREFOX_BZIP2_URL"
        curl $FIREFOX_BZIP2_URL > $FIREFOX_BZIP2_FILENAME
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
    if [ -f $SELENIUM_PID_FILE ]; then
        echo "Selenium server is already running ($SELENIUM_PID_FILE)"
        exit 1
    fi
    # options are listed at http://code.google.com/p/selenium/wiki/FirefoxDriver
    if [ $FULL_SELENIUM_DEBUG ]; then
      java -jar $SELENIUM_JAR_FILENAME -Dwebdriver.firefox.bin=$PWD/bin/firefox -Dwebdriver.log.file=$PWD/console.log -Dwebdriver.firefox.logfile=/dev/stdout &
    else
      java -jar $SELENIUM_JAR_FILENAME -Dwebdriver.firefox.bin=$PWD/bin/firefox -Dwebdriver.log.file=$PWD/console.log -Dwebdriver.firefox.logfile=$PWD/firefox.log &>/dev/null &
    fi
    PID=$!
    echo $PID > $SELENIUM_PID_FILE
    CODE="000"
    while [ $CODE != "200" ]; do
        CODE=$(curl -sL -w "%{http_code}" http://localhost:4444/wd/hub -o /dev/null)
        sleep 0.1
    done
    echo "Selenium server started ($SELENIUM_JAR_FILENAME, pid=$PID)"
}

stop() {
    if [ ! -f $SELENIUM_PID_FILE ]; then
        echo "Selenium server not running"
        exit 1
    fi
    cat $SELENIUM_PID_FILE | xargs kill -15
    rm -f $SELENIUM_PID_FILE
    echo "Selenium server stopped"
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
