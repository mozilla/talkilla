#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import signal
import subprocess
import unittest
import functools
import pdb
import sys

from selenium.common.exceptions import TimeoutException


# With debug_on, you can add a line prior to your test function
# which will enable you to catch test exceptions, and automatically
# switch to the debugger for a post mortem:
#
# from browser_test import debug_on
# ...
#     @debug_on()
#     def test_my_test...
#
# This is also useful for examining the firefox state at failure points
def debug_on(*exceptions):
    if not exceptions:
        exceptions = (AssertionError, TimeoutException, )

    def decorator(f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except exceptions:
                pdb.post_mortem(sys.exc_info()[2])
        return wrapper
    return decorator


# Utility function to aid debugging. Call this in a try/except/raise block
# to get a url dumped which is a screenshot of the frame that the driver is
# showing.
# XXX Make the tests do this automatically on failure
def output_base64_screenshot(driver):
    print("data:image/png;base64," + driver.get_screenshot_as_base64())


def kill_app(app):
    os.kill(app.pid, signal.SIGTERM)


class BrowserTest(unittest.TestCase):
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

    @classmethod
    def assertCallMediaPlaying(cls, driver):
        # the spec defines playing to be not paused
        cls.assertMediaElementNotPaused(driver, ".local-media")
        cls.assertMediaElementNotPaused(driver, ".remote-media")

    @staticmethod
    def assertMediaElementNotPaused(driver, css_selector):
        el = driver.waitForElementWithAttrOrPropValue(
            css_selector, attr_or_prop_name="paused", attr_or_prop_value=None)

        if el.get_attribute("paused"):
            raise AssertionError((u'media element matching %s paused' %
                                  css_selector))

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

    def assertElementVisibleAndInView(self, driver, css_selector):

        # wait for the element to be what WebDriver considers visible,
        # which is necessary but not sufficient to verify that a human
        # would be able to see at least part of it
        self.assertElementVisible(driver, css_selector)
        found_element = driver.find_element_by_css_selector(css_selector)

        # JS thanks to http://stackoverflow.com/questions/123999/
        js_checker = """
        var el = arguments[0];

        var eap,
        rect     = el.getBoundingClientRect(),
        docEl    = document.documentElement,
        vWidth   = window.innerWidth || docEl.clientWidth,
        vHeight  = window.innerHeight || docEl.clientHeight,
        efp      = function (x, y) { return document.elementFromPoint(x, y) },
        contains = "contains" in el ? "contains" : "compareDocumentPosition",
        has = contains == "contains" ? 1 : 0x10;

        // Return false if it's not in the viewport
        if (rect.right < 0 || rect.bottom < 0 || rect.left > vWidth ||
            rect.top > vHeight)
        return false;

        // Return true if any of its four corners are visible
        return (
            (eap = efp(rect.left,  rect.top)) == el
         || el[contains](eap) == has
         || (eap = efp(rect.right, rect.top)) == el
         || el[contains](eap) == has
         || (eap = efp(rect.right, rect.bottom)) == el
         || el[contains](eap) == has
         || (eap = efp(rect.left,  rect.bottom)) == el
         || el[contains](eap)
         == has)
        """

        if not driver.execute_script(js_checker, found_element):
            raise AssertionError(u"%s is completely out of view" %
                                 css_selector)

    def assertElementNotVisible(self, driver, css_selector):
        if driver.waitForElement(css_selector).is_displayed():
            raise AssertionError(u"%s is visible, it shouldn't be" % (
                css_selector))

    def assertElementsCount(self, driver, css_selector, length):
        # If there's more than one element wait for it to be displayed
        # XXX Waiting for no elements is currently not possible, we'd need
        # to write a special wait routing for elements that never get
        # displayed (e.g. link elements).
        if length == 0:
            elements = driver.find_elements_by_css_selector(css_selector)
        else:
            elements = driver.waitForElements(css_selector)

        if len(elements) != length:
            raise AssertionError(u"%s does not contain %d elements" % (
                css_selector, length))

    def assertIncomingCall(self, driver):
        self.assertElementVisible(driver, ".incoming-text")

    def assertOngoingCall(self, driver):
        self.assertElementVisible(driver, "#call")
        self.assertElementVisible(driver, "#local-media")
        self.assertElementVisible(driver, "#remote-media")

    def assertPendingOutgoingCall(self, driver):
        self.assertElementVisible(driver, ".btn-abort")

    def assertConversationPresenceIconShows(self, driver, state):
        self.assertElementsCount(
            driver,
            'head > link[rel="icon"][href="img/presence/%s.png"]' % state,
            1)

    def assertCallTimedOut(self, driver):
        self.assertElementVisible(driver, ".btn-call-again")

    def assertSignedInAs(self, driver, nick):
        driver.switchToSidebar()
        # We might have just reloaded, so wait a bit in case it
        # isn't there yet.
        self.assertElementTextEquals(driver, "strong.nick", nick, True)
        self.assertElementVisible(driver, "#signout")

    def assertSignedOut(self, driver):
        self.assertElementNotVisible(driver, "#signout")

    def assertTitleEquals(self, driver, title):
        if driver.title != title:
            raise AssertionError(u'Title does not equal "%s"; got "%s"' % (
                title, driver.title))


# SingleNodeBrowserTest is used for starting up a single
# node instance that is used for all tests in a test class.
class SingleNodeBrowserTest(BrowserTest):
    @classmethod
    def setUpClass(cls):
        cmd = ("node", "app.js")
        env = os.environ.copy()
        env.update({"PORT": "3000",
                    "NO_LOCAL_CONFIG": "true",
                    "NODE_ENV": "test"})
        cls.node_app = subprocess.Popen(cmd, env=env)

    @classmethod
    def tearDownClass(cls):
        os.kill(cls.node_app.pid, signal.SIGTERM)


# MultipleNodeBrowserTest is used for starting up a
# node instance for each test in a test class.
class MultipleNodeBrowserTest(BrowserTest):
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
