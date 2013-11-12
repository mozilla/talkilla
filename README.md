Talkilla
========

Video call exploration

Local Development
-----------------

1. Talkilla currently requires Firefox >= 25.

2. Make sure you have [node installed](http://nodejs.org/).

3. Install the required node dependencies:

        $ npm install
        # or alternatively:
        $ make install

4. Start the server:

        $ make runserver
        # or alternatively:
        $ env NODE_ENV=development PORT=5000 SESSION_SECRET=unguessable node app.js

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

Testing
-------

Talkilla has a comprehensive test suite. See the [docs/tests.md](docs/tests.md) file for more detail.

Debugging
---------

There are various ways to debug Talkilla, see the [docs/debugging.md](docs/debugging.md) file for more detail.

Contribution
------------

Look for a file named [CONTRIBUTING.md](CONTRIBUTING.md) in this repository. It
contains our contributing guidelines.

License
-------

All source code here is available under the
[MPL 2.0](https://mozilla.org/MPL/2.0/) license, unless otherwise
indicated.
