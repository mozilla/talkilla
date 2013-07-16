# -*- coding: utf-8 -*-

import os

from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support.ui import WebDriverWait

SELENIUM_COMMAND_EXECUTOR = os.getenv("SELENIUM_COMMAND_EXECUTOR",
                                      "http://127.0.0.1:4444/wd/hub")

MS_PER_SEC = 1000


class Driver(WebDriver):
    nick = None

    def __init__(self, *args, **kwargs):
        if "nick" in kwargs and kwargs["nick"] is not None:
            self.nick = kwargs["nick"]
        del kwargs["nick"]
        super(Driver, self).__init__(*args, **kwargs)

    def openConversationWith(self, nick):
        """ Opens a new conversation window with the user matching the provided
            nick.

            Args:
            - nick: Peer username
        """
        self.switchToSidebar()
        nicks = self.waitForElements("ul.nav-list>li>a", visible=True)
        filter(lambda e: e.text == nick, nicks)[0].click()
        return self.switchToChatWindow()

    def clickElement(self, css_selector):
        """ Clicks the element matching the provided CSS selector."""
        self.waitForElement(css_selector, visible=True).click()

    def signin(self):
        """ Signs the user in."""
        if not self.nick:
            raise RuntimeError("No nick provided")
        self.switchToSidebar()
        self.waitForElement("#nick").send_keys(self.nick)
        self.clickElement("#submit")
        return self

    def signout(self):
        """Signs the user out."""
        self.switchToSidebar()
        self.clickElement('#signout button')
        return self

    def startCall(self, video):
        """ Starts a new call.

            Args:
            - video: True for video, else audio only
        """
        self.clickElement(".btn-video>a" if video else ".btn-audio>a")

    def acceptCall(self):
        """ Accepts an incoming call."""
        self.clickElement(".btn-accept")

    def sendChatMessage(self, message):
        """ Sends a text chat message.

            Args:
            - message: Text chat message contents
        """
        self.switchToChatWindow()
        input_text = self.waitForElement("form input", visible=True)
        input_text.send_keys(message)
        input_text.send_keys(Keys.RETURN)

    def switchToFrame(self, locator, timeout=5):
        """ Wait for a frame to become available, then switch to it.

            Args:
            - localtor: Frame locator string

            Kwargs:
            - timeout: Operation timeout in seconds

            Returns: Driver
        """
        def switch(driver):
            try:
                self.switch_to_frame(locator)
                return True
            except:
                return False
        msg = u"Couldn't switch to frame: %s; timeout of %ss. exhausted" % (
            locator, timeout)
        WebDriverWait(self, timeout, poll_frequency=.25).until(switch,
                                                               message=msg)
        return self

    def switchToChatWindow(self):
        """Switches to the Social API chat window."""
        return self.switchToFrame("//chatbox")

    def switchToSidebar(self):
        """Switches to the Social API sidebar."""
        return self.switchToFrame("//#social-sidebar-browser")

    def waitForElement(self, css_selector, timeout=5, visible=None):
        """ Waits for a single DOM element matching the provided CSS selector
            do be available.

        Args:
        - css_selector: CSS selector string

        Kwargs:
        - timeout: Operation timeout in seconds
        - visible: Ensure elements visibility status:
                   * True: wait for visible elements only
                   * False: wait for invisible elements only
                   * None: skip visibility status checks

        Returns: Single DOM element
        """
        elements = self.waitForElements(css_selector, timeout=timeout,
                                        visible=visible)
        if len(elements) > 0:
            return elements[0]
        raise NoSuchElementException("No element matching " + css_selector)

    def waitForElements(self, css_selector, timeout=5, visible=None):
        """ Waits for DOM elements matching the provided CSS selector to be
            available.

            Args:
            - css_selector: CSS selector string

            Kwargs:
            - timeout: Operation timeout in seconds
            - visible: Ensure elements visibility status:
                       * True: wait for visible elements only
                       * False: wait for invisible elements only
                       * None: skip visibility status checks

            Returns: List of DOM elements
        """
        def get_element_checker(driver, visible):
            locator = (By.CSS_SELECTOR, css_selector)
            if visible is True:
                return EC.visibility_of_element_located(locator)
            if visible is False:
                return EC.invisibility_of_element_located(locator)
            return lambda _: driver.find_elements_by_css_selector(css_selector)

        message = u"Couldn't find elems matching %s (visibility check: %s)" % (
            css_selector, visible)
        WebDriverWait(self, timeout, poll_frequency=.25).until(
            get_element_checker(self, visible), message=message)

        return self.find_elements_by_css_selector(css_selector)


def create(nick=None):
    driver = Driver(command_executor=SELENIUM_COMMAND_EXECUTOR,
                    desired_capabilities={"browserName": "firefox"},
                    nick=nick)
    return driver
