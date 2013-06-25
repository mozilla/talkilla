#!/usr/bin/env python

import json
import os
import signal
import subprocess
import time
import unittest

from selenium import webdriver
from selenium.webdriver.firefox.firefox_binary import FirefoxBinary
from selenium.webdriver.firefox.firefox_profile import FirefoxProfile
from selenium.webdriver.remote.webdriver import WebDriver

from user_prefs import USER_PREFS


TEST_PROFILE_PATH = os.path.join(os.path.abspath(os.path.dirname(__file__)),
                                 "profile")
FF_BINARY = os.getenv("FF_BINARY",
                      "/Applications/FirefoxNightly.app/Contents/MacOS/firefox")
FF_PROFILE = os.getenv("FF_PROFILE", TEST_PROFILE_PATH)

def create_driver():
    profile = FirefoxProfile()
    for pref_name in USER_PREFS.keys():
        profile.set_preference(pref_name, json.dumps(USER_PREFS[pref_name]))
    return WebDriver(command_executor="http://127.0.0.1:4444/wd/hub",
                     desired_capabilities={"browserName": "firefox"},
                     browser_profile=profile)


class BaseTest(unittest.TestCase):
    """Base test case."""

    def setUp(self):
        app_cmd = 'PORT=3000 NODE_ENV=test node app.js'
        self.node_app = subprocess.Popen(app_cmd, stdout=subprocess.PIPE,
                                         shell=True, preexec_fn=os.setsid)
        #self.larry = create_driver()
        self.bob = create_driver()

    def tearDown(self):
        self.bob.close()
        #self.larry.close()
        os.killpg(self.node_app.pid, signal.SIGTERM)
        self.node_app.kill()
        # ps aux|grep "node app"|grep -v grep|awk '{print $2}'|xargs kill


class TalkillaApptest(BaseTest):

    def test_public_homepage_test(self):
        self.bob.get("http://127.0.0.1:3000/")
        self.bob.find_element_by_css_selector("button")

    def test_sidebar(self):
        self.bob.switch_to_frame("//#social-sidebar-browser")


if __name__ == "__main__":
    try:
        unittest.main()
    except KeyboardInterrupt:
        print "\nInterrupted."
