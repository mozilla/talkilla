Talkilla loadtest
=================

To install the load test, make sure you have Python 2.6 or 2.7
Make and virtualenv, and run::

    $ make build

This will create a local environement with all deps.

Next, try a single run against your Talkilla server::

    $ AWS_SERVER=your.talkilla.server make test


Where *AWS_SERVER* is your Talkilla server root url. Make sure
your server is in test mode and does not check the Persona
assertion for real.

You can run with more users, using this command line::

    $ AWS_SERVER=your.talkilla.server bin/loads-runner test_talkilla.TestTalkilla.test_call -u 50

Where -u is the number of concurrent tests to run. Since each test
simulates a conversation between two users, 50 means you will have 100
users connected simultaneously on your Talkilla server.

You can also have that test running for a longer time using *-d seconds*

Example of a 60 seconds run with 100 concurrent runs::

    $ AWS_SERVER=your.talkilla.server bin/loads-runner test_talkilla.TestTalkilla.test_call -u 100 -d 60


