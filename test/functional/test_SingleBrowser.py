#!/usr/bin/env python
# -*- coding: utf-8 -*-

import mixins
import unittest

from browser_test import BrowserTest


class SingleBrowserTest(mixins.WithBob, BrowserTest):
    def test_public_homepage(self):
        self.bob.get("http://127.0.0.1:3000/")
        self.bob.find_element_by_css_selector("button")

    def test_sidebar(self):
        self.bob.switchToSidebar()
        self.assertTitleEquals(self.bob, "Talkilla Sidebar")

    def test_login_persistence_over_reload(self):
        """ Checks that even if the user reloads the sidebar from the context
            menu, she'll remain logged in.
        """
        self.bob.switchToSidebar()
        self.bob.signin()

        self.bob.refresh()

        self.assertSignedInAs(self.bob, "bob")

    def test_login_persistence_over_restart(self):
        """ Test that the user remains logged in across browser restarts.
        """
        self.bob.signin()

        # save off session & profile state for creation of new browser env
        cookies = self.bob.get_cookies()
        capabilities = self.bob.desired_capabilities

        # get a new browser
        self.bob.quit()
        self.bob.start_session(capabilities)

        # inject the cookies into sidebar domain, as they include our login
        # state
        self.bob.switchToSidebar()
        for cookie in cookies:
            self.bob.add_cookie(cookie)

        # force a refresh so that the page sees the cookies
        self.bob.refresh()

        self.assertSignedInAs(self.bob, "bob")


if __name__ == "__main__":
    unittest.main(catchbreak=True)
