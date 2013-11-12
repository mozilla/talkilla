Talkilla loadtest
=================

To install the load test, make sure you have Python 2.6 or 2.7
Make and virtualenv, and run::

    $ make build

This will create a local environement with all deps.

Next, try a sing run against your Talkilla server::

    $ AWS_SERVER=your.talkilla.server make test


Where AWS_SERVER is your Talkilla url. Make sure your server
is in test mode and does not check the persona assertion for real.

You can run with more users, using this command line::

    $ AWS_SERVER=your.talkilla.server bin/loads-runner test_talkilla.TestTalkilla.test_call -u 50

Where -u is the number of concurrent tests to run. Since each test
simulates a conversation between two users, 50 means you will have 100
users connected simultaneously on your Talkilla server.
