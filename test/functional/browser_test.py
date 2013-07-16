#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import signal
import subprocess
import unittest

from selenium.common.exceptions import TimeoutException


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

    def assertChatMessageContains(self, driver, message, line=1):
        driver.switchToChatWindow()
        css_selector = "#textchat li"
        if line > 1:
            css_selector += ":nth-child(%d)" % line
        try:
            self.assertElementTextContains(driver, css_selector, message)
        except AssertionError, err:
            raise AssertionError(u'Chat message containing "%s" not found; %s'
                                 % (message, err))

    def assertElementTextContains(self, driver, css_selector, text,
                                  visible=None):
        element_text = driver.waitForElement(css_selector,
                                             visible=visible).text
        if not text in element_text:
            raise AssertionError(u"%s inner text does not contain %s" % (
                css_selector, text))

    def assertElementTextEquals(self, driver, css_selector, text,
                                visible=None):
        element_text = driver.waitForElement(css_selector,
                                             visible=visible).text
        if not element_text == text:
            raise AssertionError(u"%s inner text does not equal %s" % (
                css_selector, text))

    def assertElementVisible(self, driver, css_selector):
        try:
            driver.waitForElement(css_selector, visible=True)
        except TimeoutException:
            raise AssertionError(u"%s is not visible, it should be"
                                 % css_selector)

    def assertElementNotVisible(self, driver, css_selector):
        if driver.waitForElement(css_selector).is_displayed():
            raise AssertionError(u"%s is visible, it shouldn't be" % (
                css_selector))

    def assertElementsCount(self, driver, css_selector, length):
        elements = driver.find_elements_by_css_selector(css_selector)
        if len(elements) != length:
            raise AssertionError(u"%s does not contain %d elements" % (
                css_selector, length))

    def assertIncomingCall(self, driver):
        self.assertElementVisible(driver, ".incoming-text")

    def assertOngoingCall(self, driver):
        self.assertElementVisible(driver, "#call")
        self.assertElementVisible(driver, "#local-video")
        self.assertElementVisible(driver, "#remote-video")

    def assertPendingOutgoingCall(self, driver):
        self.assertElementVisible(driver, ".outgoing-text")

    def assertSignedInAs(self, driver, nick):
        driver.switchToSidebar()
        self.assertElementTextEquals(driver, "strong.nick", nick)
        self.assertElementVisible(driver, "#signout")

    def assertSignedOut(self, driver):
        self.assertElementNotVisible(driver, "#signout")

    def assertTitleEquals(self, driver, title):
        if driver.title != title:
            raise AssertionError(u'Title does not equal "%s"; got "%s"' % (
                title, driver.title))
