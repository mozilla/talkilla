Talkilla
========

Video call exploration

Local Development
-----------------

1. Talkilla currently requires Firefox >= 24.

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

Optional settings are:

- `DEBUG`: to have log messages printed out to the browser console
- `ROOTURL`: the url to the server (this can also be specified by PUBLIC_URL in the environment)
- `WSURL`: the url to the [WebSocket](http://www.websocket.org/) server endpoint

Unit Tests
----------

To run the unit tests:

1. Make sure you've installed node and the required modules as per the local development section.

2. On Mac, you need to have /Applications/FirefoxNightly.app installed

3. On Linux, you need to have /usr/bin/firefox-nightly present, or a Firefox will be downloaded for you.

4. Run the tests:

        $ make test


Front-end Tests
---------------

To run the front-end unit tests standalone:

1. First make sure you are running the server in development mode:

    $ make runserver_dev

2. Visit http://localhost:5000/test/frontend/index.html


Functional Tests
----------------

You'll need Python 2.7+ and
[virtualenv](https://pypi.python.org/pypi/virtualenv).

    $ cd /path/to/talkilla

Run the tests, bootstrapping necessary dependencies from the net:

    $ make selenium

To run the tests repeatedly, automatically for 10 runs or until failure:

    $ make selenium-repeat

To run an individual file for 20 runs, or until failure:

    $ REPEAT_TEST=test/functional/test_SingleBrowser.py REPEAT_TIMES=20 make selenium-repeat

To get full debug output from selenium and Firefox, specify FULL_SELENIUM_DEBUG on the command line:

    $ FULL_SELENIUM_DEBUG=1 make selenium

Working With Individual Functional Test Files
---------------------------------------------

Run one test file:

    $ ./bin/run_selenium_test.sh test/functional/test_SingleBrowser.py

Debugging a single test:

    # start selenium and get the right stuff in your $PATH
    $ ./bin/selenium.sh start
    $ source .venv/bin/activate
    (.venv) $

    # If you're on a Mac, be sure you've installed readline in your
    # virtualenv first, using easy_install and NOT using pip:
    (.venv) $ easy_install readline

    # start debugging the file you care about
    (.venv) $ python -m ipdb test/functional/test_SingleBrowser.py

    # set breakpoint on the 1st line of test_public_homepage & continue
    ipdb> b 11
    ipdb> c

    # breakpoint has fired; see what else you can do
    ipdb> help


Contribution
------------

Look for a file named `CONTRIBUTING.md` in this repository. It
contains our contributing guidelines.

License
-------

All source code here is available under the
[MPL 2.0](https://mozilla.org/MPL/2.0/) license, unless otherwise
indicated.
