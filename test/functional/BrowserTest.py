#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import signal
import subprocess
import unittest


def kill_app(app):
    os.kill(app.pid, signal.SIGTERM)


class BrowserTest(unittest.TestCase):
    node_app = None

    def setUp(self):
        cmd = ("node", "app.js")
        env = os.environ.copy()
        env.update({"PORT": "3000",
                    "NO_LOCAL_CONFIG": "true",
                    "NODE_ENV": "test"})
        self.node_app = subprocess.Popen(cmd, env=env)
        self.addCleanup(kill_app, self.node_app)

    def tearDown(self):
        kill_app(self.node_app)
