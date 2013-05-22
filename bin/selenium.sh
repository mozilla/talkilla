#!/bin/bash

SELENIUM_JAR_FILENAME="selenium-server-standalone-2.32.0.jar"
SELENIUM_JAR_URL="http://people.mozilla.com/~mbanner2/talkilla/$SELENIUM_JAR_FILENAME"
SELENIUM_PID_FILE="/tmp/selenium-server-pid"

install() {
    if [ ! -f $SELENIUM_JAR_FILENAME ]; then
        echo "Downloading $SELENIUM_JAR_URL"
        curl $SELENIUM_JAR_URL > $SELENIUM_JAR_FILENAME
        echo "Selenium server install in $SELENIUM_JAR_FILENAME"
    fi
}

start() {
    if [ -f $SELENIUM_PID_FILE ]; then
        echo "Selenium server is already running ($SELENIUM_PID_FILE)"
        exit 1
    fi
    PATH=`pwd`/bin:$PATH
    java -jar $SELENIUM_JAR_FILENAME &>/dev/null &
    PID=$!
    echo $PID > $SELENIUM_PID_FILE
    CODE="000"
    while [ $CODE != "200" ]; do
        CODE=$(curl -sL -w "%{http_code}" http://localhost:4444/wd/hub -o /dev/null)
        sleep 0.1
    done
    echo "Selenium server started"
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
