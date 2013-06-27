Talkilla
========

Video call exploration

Local Development
-----------------

1. Talkilla currently requires Firefox > 23.

2. Make sure you have [node installed](http://nodejs.org/).

3. Install the required node dependencies:

        $ npm install
        # or alternatively:
        $ make install

4. Start the server:

        $ env PORT=5000 node app.js
        # or alternatively:
        $ make runserver

5. In Firefox, set `media.navigator.permission.disabled` to `true`

6. Point your web browser to [http://localhost:5000](http://localhost:5000).


Configuration
-------------

App configuration is done using JSON files stored in the `config/` directory:

- `dev.json` for the `dev` environment configuration
- `prod.json` for the `prod` environment configuration
- `local.json` for any settings you may want to override locally
  (this file is never versionned)

Settings are:

- `DEBUG`: to have log messages printed out to the browser console
- `WSURL`: the url to the [WebSocket](http://www.websocket.org/) server endpoint

Unit Tests
----------

To run the unit tests:

1. Make sure you've installed node and the required modules as per the local development section.

2. On Mac, you need to have /Applications/FirefoxNightly.app installed (aka Firefox 24)

3. On Linux, you need to have /usr/bin/firefox-nightly present, or a Firefox will be downloaded for you.

4. Run the tests:

        $ make test


Front-end Tests
---------------

To run the front-end unit tests standalone:

1. First make sure you are running the server in development mode:

    $ make runserver_dev

2. Visit http://localhost:5000/test/frontend/index.html


Integration Tests
-----------------

You'll need Python 2.7+ and the [selenium](https://pypi.python.org/pypi/selenium)
package in order to run the integration tests suite.

First create a [virtualenv](https://pypi.python.org/pypi/virtualenv):

    $ cd /path/to/talkilla
    $ virtualenv `pwd`/.venv

Acticate it:

    $ source .venv/bin/activate
    (.venv) $

Start the selenium server:

    (.venv) $ bin/selenium.sh start

Run the tests:

    (.venv) $ python test/functional/test.py

Debugging Functional Tests
--------------------------
It can useful to execute individual functional tests in the Node debugger.
Example usage:

1. (add a "debugger;" statement to the code where you want the debugger to break)
2. # SOLO_FILE=chatwindow_test.js make debug_test
3. (debug)
4. (remove the debugger statement)

Note that because most of the things in the webdriver-selenium API that
look like imperative statements are actually magic things that cause most
of the semantics of the commands be enqueued by the ControlFlow piece of
the "promise manager" to be executed at some point in the future. It can
take some experimenting to figure out where to usefully put the debugger
statements.  It may be particularly useful to add a then() handler to the
first promise-returning statement in the test you want to debug and put
the debugger statement there.

https://code.google.com/p/selenium/wiki/WebDriverJs#Writing_Tests has more
details on how this stuff fits together.

Contribution
------------

Look for a file named `CONTRIBUTING.md` in this repository. It
contains our contributing guidelines.

License
-------

All source code here is available under the
[MPL 2.0](https://mozilla.org/MPL/2.0/) license, unless otherwise
indicated.
