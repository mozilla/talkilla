import os
import signal
import subprocess
import unittest

# some of our helper models are in the test/functional dir, so we need to add
# that to the search path
import sys
sys.path.insert(1, sys.path[0] + "/../functional")
import driver


SERVER_PREFIX = 'http://localhost:3000/test/frontend/'


def kill_app(app):
    os.kill(app.pid, signal.SIGTERM)


class FrontEndSuite(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cmd = ("node", "app.js")
        env = os.environ.copy()
        env.update({"PORT": "3000",
                    "NO_LOCAL_CONFIG": "true",
                    "NODE_ENV": "test"})
        cls.node_app = subprocess.Popen(cmd, env=env)
        cls.drvr = driver.create()
        cls.drvr.implicitly_wait(20)

    @classmethod
    def tearDownClass(cls):
        cls.drvr.quit()
        kill_app(cls.node_app)

    def check_page_for_zero_failures(self, url):
        self.drvr.get(url)
        self.drvr.find_element_by_id('complete')
        failNode = self.drvr.find_element_by_css_selector('.failures > em')
        assert failNode.text == "0"

    def test_index_html(self):
        self.check_page_for_zero_failures(SERVER_PREFIX + "index.html")

    def test_chat_index_html(self):
        self.check_page_for_zero_failures(SERVER_PREFIX + "chat/index.html")

    def test_port_html(self):
        self.check_page_for_zero_failures(SERVER_PREFIX + "port/index.html")

    def test_sidebar_html(self):
        self.check_page_for_zero_failures(SERVER_PREFIX + "sidebar/index.html")

    def test_webrtc_index_html(self):
        self.check_page_for_zero_failures(SERVER_PREFIX + "webrtc/index.html")

    def test_worker_index_html(self):
        self.check_page_for_zero_failures(SERVER_PREFIX + "worker/index.html")


if __name__ == "__main__":
    unittest.main(catchbreak=True)
