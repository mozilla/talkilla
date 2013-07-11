#!/usr/bin/env python
# -*- coding: utf-8 -*-

import mixins
import unittest
import BrowserTest


class MultipleBrowsersTest(mixins.WithBob, mixins.WithLarry, BrowserTest.BrowserTest):
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

        # Bob checks for his own chat window
        self.bob.switch_to_frame("//chatbox")

if __name__ == "__main__":
    try:
        unittest.main()
    except KeyboardInterrupt:
        print "\nInterrupted."
