# -*- coding: utf-8 -*-

import json

from selenium.webdriver.firefox.firefox_profile import FirefoxProfile
from selenium.webdriver.remote.webdriver import WebDriver

from user_prefs import USER_PREFS


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


def create(nick=None):
    profile = FirefoxProfile()
    for pref_name in USER_PREFS.keys():
        profile.set_preference(pref_name, json.dumps(USER_PREFS[pref_name]))
    return Driver(command_executor="http://127.0.0.1:4444/wd/hub",
                  desired_capabilities={"browserName": "firefox"},
                  browser_profile=profile, nick=nick)
