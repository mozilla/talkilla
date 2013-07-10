#!/usr/bin/env python
# -*- coding: utf-8 -*-

import mixins
import os
import signal
import subprocess
import unittest

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


class SingleBrowserTest(mixins.WithBob, BrowserTest):
    def test_public_homepage(self):
        self.bob.get("http://127.0.0.1:3000/")
        self.bob.find_element_by_css_selector("button")

    def test_sidebar(self):
        self.bob.switch_to_frame("//#social-sidebar-browser")
        assert self.bob.title == "Talkilla Sidebar"

    # checks that even if the user reloads the sidebar from the context menu,
    # she'll remain logged in.
    def test_login_persistence_over_reload(self):
        self.bob.switch_to_frame("//#social-sidebar-browser")
        self.bob.signin()

        self.bob.refresh()

        assert self.bob.isSignedIn()

    # test that the user remains logged in across browser restarts
    def test_login_persistence_over_restart(self):
        self.bob.signin()

        # save off session & profile state for creation of new browser env
        cookies = self.bob.get_cookies()
        capabilities = self.bob.desired_capabilities

        # get a new browser
        self.bob.quit()
        self.bob.start_session(capabilities)

        # inject the cookies into sidebar domain, as they include our login state
        self.bob.switch_to_frame("//#social-sidebar-browser")
        for cookie in cookies:
            self.bob.add_cookie(cookie)

        # force a refresh so that the page sees the cookies
        self.bob.refresh()

        assert self.bob.isSignedIn()

class MultipleBrowsersTest(mixins.WithBob, mixins.WithLarry, BrowserTest):
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

    def test_chat_window(self):
        # Sign both users in
        self.bob.signin()
        self.larry.signin()

        # Bob calls Larry
        self.bob.implicitly_wait(4000)
        self.bob.find_element_by_css_selector("ul.nav-list>li>a").click()

        # Larry checks for the chat window
        self.larry.switch_to_frame("//chatbox")

if __name__ == "__main__":
    try:
        unittest.main()
    except KeyboardInterrupt:
        print "\nInterrupted."
