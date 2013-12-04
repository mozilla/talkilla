Talkilla Automated Tests
========================

The Talkilla repository contains various levels of tests:

* Lint tests
  * These are used to ensure that the code uses the general standards defined in the Coding Style of the (Contributing document)[../CONTRIBUTING.md]
* Mocha tests
  * These are unit tests to test the Talkilla node.js server
* Front-end tests
  * These are for unit testing the front-end client javascript code, they use the selenium server to run within the browser
* Functional tests
  * These ensure that Talkilla works functionally correctly

Running all Tests
-----------------

To run the tests:

1. Make sure you've installed node and the required modules as per the local development section of the [README.md file](../README.md)

2. Make sure you have:
  * Mac: /Applications/FirefoxNightly.app installed
  * Linux: /usr/bin/firefox-nightly installed, or a Firefox will be downloaded for you.

3. Run the tests:

        $ make test

Lint Tests
----------

To run the lint tests standalone:

        $ make lint

Mocha Tests
-----------

The test files are found in `test/server`

To run the server unit tests standalone:

        $ make mocha

Front-end Tests
---------------

The test files are found in `test/frontend/`

To run the front-end unit tests standalone:

1. First make sure you are running the server in development mode:

        $ make runserver_dev

2. Visit http://localhost:5000/test/frontend/index.html

You can also run the unit tests all together with:

    $ make frontend

Functional Tests
----------------

The test files are found in `test/functional/`

You'll need Python 2.7.X (not Python 3.X) and
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

Run one test in particular in a file (the quotes are important):

    $ ./bin/run_selenium_test.sh "test/functional/test_MultipleBrowsers.py MultipleBrowsersTest.test_video_call"

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

Generating a screenshot for failing functional tests
----------------------------------------------------

You can generate a url for failing functional tests, this is especially helpful when the tests are running remote, e.g. on Travis CI.

To generate a screenshot at any time, first ensure the function is imported:

    from browser_test import output_base64_screenshot

Then, call the function at the approriate point, this can be before or after a failure:

    output_base64_screenshot(self)
