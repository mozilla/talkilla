#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import signal
import subprocess
import unittest


class BrowserTest(unittest.TestCase):
    def setUp(self):
        super(BrowserTest, self).setUp()
        app_cmd = 'PORT=3000 NO_LOCAL_CONFIG=true NODE_ENV=test node app.js'
        self.node_app = subprocess.Popen(app_cmd, stdout=subprocess.PIPE,
                                         shell=True, preexec_fn=os.setsid)

    def tearDown(self):
        os.killpg(self.node_app.pid, signal.SIGTERM)
        self.node_app.kill()
        # ps aux|grep "node app"|grep -v grep|awk '{print $2}'|xargs kill
