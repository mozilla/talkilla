# -*- coding: utf-8 -*-

import os

from selenium.common.exceptions import NoSuchElementException, \
    InvalidElementStateException, TimeoutException, WebDriverException
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support.ui import WebDriverWait
from config import testConfig

SELENIUM_COMMAND_EXECUTOR = os.getenv("SELENIUM_COMMAND_EXECUTOR",
                                      "http://127.0.0.1:4444/wd/hub")
BASE_APP_URL = "http://localhost:3000"
DEFAULT_WAIT_TIMEOUT = testConfig['DEFAULT_WAIT_TIMEOUT']


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
        self.waitForElement("ul.nav-list>li>a[title=" + nick + "]",
                            visible=True).click()
        return self.switchToChatWindow()

    def clickElement(self, css_selector):
        """ Clicks the element matching the provided CSS selector."""
        self.waitForElement(css_selector, visible=True).click()

    def getElementProperty(self, element, property_name):
        """Returns the value of the named property as a unicode string"""
        return self.execute_script(
            "return arguments[0][arguments[1]].toString();", element,
            property_name)

    def find_uncached_element_by_css_selector(self, css_selector):
        """ Finds an uncached (and therefore current) copy of the first
        element matched by this selector.  Believed to avoid intermittent
        failure problems when doing a WebDriverWait on an attribute or
        property as described in the "avoid this!" section of
        <https://blog.mozilla.org/webqa/2012/07/12/how-to-webdriverwait/>.

            Args:
            - css_selector: selector to match

            Returns:
            - an uncached version of the first element matching the given
            selector
        """
        return self.execute_script(
            "return document.querySelector(arguments[0]);", css_selector)

    def signin(self):
        """ Signs the user in."""
        if not self.nick:
            raise RuntimeError("No nick provided")
        self.switchToSidebar()
        # Wait for everything to be loaded before we proceed, this hopefully
        # ensures we don't get into issues with cookies being loaded
        # at the wrong time, or not fully loaded.
        self.waitForElement("#signin", visible=True)
        self.add_cookie({"name": "test email", "value": self.nick})
        self.switch_to_frame("spa-setup")
        self.waitForElement("#talkilla-signin", visible=True)
        self.clickElement("#talkilla-signin")
        # Ensure we've completed logging in before proceeding
        self.switchToSidebar()
        self.waitForElement("#subpanels", visible=True)
        return self

    def signout(self):
        """Signs the user out."""
        self.switchToSidebar()
        self.clickElement('#gear-menu-tab>a')
        self.clickElement('#signout button')
        return self

    def startCall(self, video):
        """ Starts a new call.

            Args:
            - video: True for video, else audio only
        """
        self.clickElement(".btn-video>a" if video else ".btn-audio>a")

    def restartCall(self):
        """ Restarts a call. For use when the call is timed out. """
        self.clickElement(".btn-call-again")

    def acceptCall(self):
        """ Accepts an incoming call."""
        self.clickElement(".btn-accept")

    def ignoreCall(self):
        """ Ignore an incoming call."""
        self.clickElement(".btn-ignore")

    def hangupCall(self):
        """ Hangs up a call."""
        self.detectWindowClose("""
            document.getElementsByClassName("btn-hangup")[0]
                    .childNodes[0].click();
        """)

    def closeConversationWindow(self):
        """ Close a conversation Window """
        self.detectWindowClose("window.close()")

    def typeChatMessage(self, message, send=False):
        """ Types a text chat message.

            Args:
            - message: Text chat message contents

            Kwargs:
            - send: Submit form to send the message? (default: False)
        """
        self.switchToChatWindow()
        input_text = self.waitForElement("form input", visible=True)
        input_text.send_keys(message)
        if send is True:
            input_text.send_keys(Keys.RETURN)

    # We use double the default timeout here as we've seen slow startup times
    # on Travis but we don't want to extend the timeout for everything.
    def switchToFrame(self, locator, expected_url,
                      timeout=DEFAULT_WAIT_TIMEOUT * 2):
        """ Wait for a frame to become available, then switch to it.

            Args:
            - locator: Frame locator string
            - expected_url: Used to ensure that we've ended up in the new
                frame.  Note that (e.g.) chat window tests will need to append
                a hash value or something similar to ensure the URL is unique
                so that switching from one chat window to another does the
                right thing.

            Kwargs:
            - timeout: Operation timeout in seconds

            Returns: Driver
        """
        wait = WebDriverWait(self, timeout)
        wait.until(EC.frame_to_be_available_and_switch_to_it(locator))

        def wait_for_correct_document(_):

            current_url = self.current_url  # cache to avoid extra wire calls

            # if frame switches are failing, uncomment the following line to
            # help debug:
            #print "self.current_url = ", current_url

            if current_url != expected_url:
                # getting here may have been caused by the previous wait having
                # been called too soon before the server switched to the right
                # document.  Do it again, just in case.
                #
                # if, on the other hand, the cause was that the previous wait
                # was called an appropriate time, this shouldn't hurt us.
                #
                # (one or might FirefoxDriver change might make this
                # unnecessary.  yuck.  ideally, Marionette won't have this
                # problem, and when we switch to it, we'll be able to ditch
                # this nested wait.  we'll see).
                wait2 = WebDriverWait(self, DEFAULT_WAIT_TIMEOUT)
                wait2.until(EC.frame_to_be_available_and_switch_to_it(locator))
                return False

            return True

        msg = u"timed out waiting for %s to be %s after %ss seconds" % (
            locator, expected_url, timeout)
        WebDriverWait(self, timeout, poll_frequency=.25).until(
            wait_for_correct_document, message=msg)
        return self

    def switchToChatWindow(self, timeout=DEFAULT_WAIT_TIMEOUT):
        """Switches to the Social API chat window."""
        return self.switchToFrame("//chatbox",
                                  BASE_APP_URL + "/chat.html", timeout=timeout)

    def switchToSidebar(self):
        """Switches to the Social API sidebar."""
        return self.switchToFrame("//#social-sidebar-browser",
                                  BASE_APP_URL + "/sidebar.html")

    def waitForElement(self, css_selector, timeout=DEFAULT_WAIT_TIMEOUT,
                       visible=None):
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

    def waitForElements(self, css_selector, timeout=DEFAULT_WAIT_TIMEOUT,
                        visible=None):
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

    def waitForElementWithPropertyValue(self, css_selector,
                                        property_name,
                                        property_value,
                                        timeout=DEFAULT_WAIT_TIMEOUT):
        """ Waits for DOM element matching the provided CSS selector to be
            available and to have the given attribute or property set to
            the given value

            Args:
            - css_selector: CSS selector string
            - property_name: HTML attribute or DOM Element JS property name
            - property_value: Unicode string representing expected JS value

            Kwargs:
            - timeout: Operation timeout in seconds

            Returns: a single WebElement
        """

        def get_element_checker():

            def find_element_by_selector_and_prop_value(driver):

                # uncached to give the test a chance to pass
                el = self.find_uncached_element_by_css_selector(css_selector)

                # excitingly, WebDriver uses the word "attribute" to mean
                # "attribute or property"!
                if self.getElementProperty(el, property_name) == \
                        property_value:
                    return True

                return False

            return find_element_by_selector_and_prop_value

        message = u"Couldn't find elem matching %s with property '%s' set " \
                  u"to '%s')" % (css_selector, property_name,
                                 property_value)

        try:
            WebDriverWait(self, timeout, poll_frequency=.25).until(
                get_element_checker(), message=message)
        except TimeoutException:
            raise InvalidElementStateException(message)

        return self.find_uncached_element_by_css_selector(css_selector)

    def detectWindowClose(self, javascriptAction):
        """ Detects closing of a window when a javascript action is run.

            Args
            - javascriptAction - the action to run that causes the window
                                 to close
        """
        pageUnloadEventFired = False
        try:
            self.execute_async_script(javascriptAction)
        except WebDriverException as e:
            # XXX Using detection of a string may be flakey. Hopefully
            # Marionette will provide us with a proper exception we can
            # catch.
            if not "Detected a page unload event" in e.msg:
                raise
            else:
                pageUnloadEventFired = True

        # This ensures that the exception has actually fired, and didn't
        # just get passed by, or a timeout exception
        if not pageUnloadEventFired:
            raise RuntimeError("Did not detect an unload event")


def create(nick=None):
    driver = Driver(command_executor=SELENIUM_COMMAND_EXECUTOR,
                    desired_capabilities={"browserName": "firefox"},
                    nick=nick)
    return driver
