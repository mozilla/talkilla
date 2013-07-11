#!/usr/bin/env python
# -*- coding: utf-8 -*-

import mixins
import unittest
import BrowserTest


class SingleBrowserTest(mixins.WithBob, BrowserTest.BrowserTest):
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

        # inject the cookies into sidebar domain, as they include our login
        # state
        self.bob.switch_to_frame("//#social-sidebar-browser")
        for cookie in cookies:
            self.bob.add_cookie(cookie)

        # force a refresh so that the page sees the cookies
        self.bob.refresh()

        assert self.bob.isSignedIn()


if __name__ == "__main__":
    try:
        unittest.main()
    except KeyboardInterrupt:
        print "\nInterrupted."
