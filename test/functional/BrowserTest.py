#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import signal
import subprocess
import unittest


def kill_app(app):
    os.kill(app.pid, signal.SIGTERM)
    app.kill()


class BrowserTest(unittest.TestCase):
    node_app = None

    def setUp(self):
        app_cmd = 'PORT=3000 NO_LOCAL_CONFIG=true NODE_ENV=test node app.js'
        try:
            self.__class__.node_app = subprocess.Popen(
                app_cmd, stdout=subprocess.PIPE, shell=True,
                preexec_fn=os.setsid)
        finally:
            # ensure that we cleanup even if something weird happened
            self.addCleanup(kill_app, self.__class__.node_app)

    def tearDown(self):
        kill_app(self.__class__.node_app)

    @classmethod
    def tearDownClass(cls):
        if cls.node_app is not None:
            kill_app(cls.node_app)
