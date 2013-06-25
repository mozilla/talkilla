#!/usr/bin/env python
# -*- coding: utf-8 -*-

import mixins
import os
import signal
import subprocess
import unittest

TEST_PROFILE_PATH = os.path.join(os.path.abspath(os.path.dirname(__file__)),
                                 "profile")
FF_BINARY = os.getenv("FF_BINARY",
                      "/Applications/FirefoxNightly.app/Contents/MacOS/firefox")
FF_PROFILE = os.getenv("FF_PROFILE", TEST_PROFILE_PATH)


class BrowserTest(unittest.TestCase):
    def setUp(self):
        super(BrowserTest, self).setUp()
        app_cmd = 'PORT=3000 NODE_ENV=test node app.js'
        self.node_app = subprocess.Popen(app_cmd, stdout=subprocess.PIPE,
                                         shell=True, preexec_fn=os.setsid)

    def tearDown(self):
        os.killpg(self.node_app.pid, signal.SIGTERM)
        self.node_app.kill()
        # ps aux|grep "node app"|grep -v grep|awk '{print $2}'|xargs kill


# class StandardTest(mixins.WithBob, BrowserTest):
#     def test_public_homepage(self):
#         self.bob.get("http://127.0.0.1:3000/")
#         self.bob.find_element_by_css_selector("button")

#     def test_sidebar(self):
#         self.bob.switch_to_frame("//#social-sidebar-browser")
#         assert self.bob.title == "Talkilla Sidebar"


class SigninTest(mixins.WithBob, mixins.WithLarry, BrowserTest):
    def test_signin_users(self):
        # Sign in user 1
        self.bob.signin()
        assert self.bob.find_element_by_css_selector("strong.nick").text == "bob"
        assert self.bob.find_element_by_id("signout").is_displayed()

        # Check there is a message that this is the only person logged in
        assert "only person" in self.bob.find_element_by_css_selector(".alert-info").text

        # Sign in user 2
        self.larry.signin()
        assert self.larry.find_element_by_css_selector("strong.nick").text == "larry"

        # Check that both pages no longer have the alert on them
        assert len(self.bob.find_elements_by_css_selector(".alert-info")) == 0
        assert len(self.larry.find_elements_by_css_selector(".alert-info")) == 0

        # Sign out user 1
        self.bob.signout()
        assert len(self.bob.find_elements_by_css_selector(".alert-info")) == 0
        assert not self.bob.find_element_by_id("signout").is_displayed()

        # Check there's an alert on user 2's screen
        assert "only person" in self.larry.find_element_by_css_selector(".alert-info").text

        # Now sign out user 2
        self.larry.signout()
        assert len(self.larry.find_elements_by_css_selector(".alert-info")) == 0
        assert not self.larry.find_element_by_id("signout").is_displayed()


if __name__ == "__main__":
    try:
        unittest.main()
    except KeyboardInterrupt:
        print "\nInterrupted."
