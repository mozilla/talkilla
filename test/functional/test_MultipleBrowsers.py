#!/usr/bin/env python
# -*- coding: utf-8 -*-

import mixins
import unittest
import BrowserTest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class MultipleBrowsersTest(mixins.WithBob, mixins.WithLarry,
                           BrowserTest.BrowserTest):
    def test_signin_users(self):
        # Sign in user 1
        self.bob.signin()
        assert self.bob.find_element_by_css_selector(
            "strong.nick").text == "bob"
        assert self.bob.find_element_by_id("signout").is_displayed()

        # Check there is a message that this is the only person logged in
        assert "only person" in self.bob.find_element_by_css_selector(
            ".alert-info").text

        # Sign in user 2
        self.larry.signin()
        assert self.larry.find_element_by_css_selector(
            "strong.nick").text == "larry"

        # Check that both pages no longer have the alert on them
        assert len(self.bob.find_elements_by_css_selector(".alert-info")) == 0
        assert len(self.larry.find_elements_by_css_selector(
            ".alert-info")) == 0

        # Sign out user 1
        self.bob.signout()
        assert len(self.bob.find_elements_by_css_selector(".alert-info")) == 0
        assert not self.bob.find_element_by_id("signout").is_displayed()

        # Check there's an alert on user 2's screen
        assert "only person" in self.larry.find_element_by_css_selector(
            ".alert-info").text

        # Now sign out user 2
        self.larry.signout()
        assert len(self.larry.find_elements_by_css_selector(
            ".alert-info")) == 0
        assert not self.larry.find_element_by_id("signout").is_displayed()

    def test_chat_window(self):
        # Sign both users in
        self.bob.signin()
        self.larry.signin()

        # Bob calls Larry
        self.bob.find_element_by_css_selector("ul.nav-list>li>a").click()

        # Bob checks for his own chat window
        self.bob.switch_to_frame("//chatbox")

    def test_video_call(self):
        # Sign both users in
        self.bob.signin()
        self.larry.signin()

        # Bob opens Larry's conversation window
        self.bob.openConversation()

        # Bob calls Larry
        self.bob.startCall(True)

        # Bob sees the outgoing call
        assert self.bob.find_element_by_css_selector(
            ".outgoing-text").is_displayed()

        # Larry gets a window for receiving the call
        self.larry.switch_to_frame("//chatbox")

        # Larry accepts the call
        self.larry.acceptCall()

        # Larry sees the call
        wait = WebDriverWait(self.larry, 5)
        wait.until(EC.visibility_of_element_located((By.ID, "call")))
        assert self.larry.find_element_by_id("call").is_displayed()

        # Bob sees the call
        assert self.bob.find_element_by_id("call").is_displayed()


if __name__ == "__main__":
    unittest.main(catchbreak=True)
