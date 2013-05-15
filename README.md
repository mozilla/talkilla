Talkilla
========

Video call exploration

Local Development
-----------------

1. Talkilla requires Firefox > 21.

2. Make sure you have [node installed](http://nodejs.org/).

3. Install the required node dependencies:

        $ npm install
        # or alternatively:
        $ make install

4. Start the server:

        $ env PORT=5000 node app.js
        # or alternatively:
        $ make runserver

5. Point your web browser to [http://localhost:5000](http://localhost:5000).


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

2. Run the tests:

        $ make test


Browser Tests
-------------

To run the functional tests, you'll need to install [Selenium Server](http://docs.seleniumhq.org/).
Eg. for OSX using `brew`:

    $ brew install selenium-server-standalone

Start a Selenium server instance:

    $ java -jar /usr/local/opt/selenium-server-standalone/selenium-server-standalone-2.31.0.jar -p 4444

Then run the tests:

    $ mocha test/functional

Front-end Tests
---------------

To run the front-end unit tests:

1. First make sure you are running the server in development mode:

    $ make runserver_dev

2. Visit http://localhost:5000/test/frontend/index.html

Contribution
------------

Look for a file named `CONTRIBUTING.md` in this repository. It
contains our contributing guidelines.

License
-------

All source code here is available under the
[MPL 2.0](https://mozilla.org/MPL/2.0/) license, unless otherwise
indicated.

