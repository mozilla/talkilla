#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import signal
import subprocess
import unittest

from selenium.common.exceptions import TimeoutException


def kill_app(app):
    os.kill(app.pid, signal.SIGTERM)
    app.kill()


class BrowserTest(unittest.TestCase):
    node_app = None

    def setUp(self):
        app_cmd = 'PORT=3000 NO_LOCAL_CONFIG=true NODE_ENV=test node app.js'
        try:
            self.__class__.node_app = subprocess.Popen(
                app_cmd, stdout=subprocess.PIPE, shell=True)
        finally:
            # ensure that we cleanup even if something weird happened
            self.addCleanup(kill_app, self.__class__.node_app)

    def tearDown(self):
        kill_app(self.__class__.node_app)

    @classmethod
    def tearDownClass(cls):
        if cls.node_app is not None:
            kill_app(cls.node_app)

    def assertChatMessageExists(self, driver, message, item=1):
        driver.switchToChatWindow()
        css_selector = "#textchat li"
        if item > 1:
            css_selector += ":nth-child(%d)" % item
        try:
            self.assertElementTextContains(driver, css_selector, message)
        except AssertionError, e:
            raise AssertionError(u"Expected chat message doesn't exists; " + e)

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
            raise AssertionError(u"%s is not visible, it should"
                                 % css_selector)

    def assertElementNotVisible(self, driver, css_selector):
        if driver.waitForElement(css_selector).is_displayed():
            raise AssertionError(u"%s is visible, it shouldn't" % css_selector)

    def assertElementsCount(self, driver, css_selector, length):
        elements = driver.find_elements_by_css_selector(css_selector)
        if len(elements) != length:
            raise AssertionError(u"%s does not match %d elements" % (
                css_selector, length))

    def assertIncomingCall(self, driver):
        self.assertElementVisible(driver, ".incoming-text")

    def assertOngoingCall(self, driver):
        self.assertElementVisible(driver, "#call")
        self.assertElementVisible(driver, "#local-video")
        self.assertElementVisible(driver, "#remote-video")

    def assertPendingCall(self, driver):
        self.assertElementVisible(driver, ".outgoing-text")

    def assertSignedInAs(self, driver, nick):
        driver.switchToSidebar()
        self.assertElementTextEquals(driver, "strong.nick", nick)
        self.assertElementVisible(driver, "#signout")

    def assertSignedOut(self, driver):
        self.assertElementNotVisible(driver, "#signout")
