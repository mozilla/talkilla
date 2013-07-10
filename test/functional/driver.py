# -*- coding: utf-8 -*-

import os

from selenium.webdriver.remote.webdriver import WebDriver

SELENIUM_COMMAND_EXECUTOR = os.getenv("SELENIUM_COMMAND_EXECUTOR",
                                      "http://127.0.0.1:4444/wd/hub")


class Driver(WebDriver):
    nick = None

    def __init__(self, *args, **kwargs):
        if "nick" in kwargs and kwargs["nick"] is not None:
            self.nick = kwargs["nick"]
            del kwargs["nick"]
        super(Driver, self).__init__(*args, **kwargs)

    def signin(self):
        if not self.nick:
            raise RuntimeError("No nick provided")
        self.switch_to_frame("//#social-sidebar-browser")
        self.find_element_by_id("nick").send_keys(self.nick)
        self.find_element_by_id("submit").click()

    def signout(self):
        self.switch_to_frame("//#social-sidebar-browser")
        self.find_element_by_css_selector('#signout button').click()

    def isSignedIn(self):
        return self.find_element_by_css_selector("strong.nick").text != ""


def create(nick=None):
    return Driver(command_executor=SELENIUM_COMMAND_EXECUTOR,
                  desired_capabilities={"browserName": "firefox"},
                  nick=nick)
