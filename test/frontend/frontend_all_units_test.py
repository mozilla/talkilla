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
TEST_URLS = [SERVER_PREFIX + p for p in [
    'index.html',
    'chat/index.html',
    'webrtc/index.html',
    'worker/index.html'
]]


def kill_app(app):
    os.kill(app.pid, signal.SIGTERM)


class FrontEndSuite(unittest.TestCase):
    def setUp(self):
        super(FrontEndSuite, self).setUp()
        cmd = ("node", "app.js")
        env = os.environ.copy()
        env.update({"PORT": "3000",
                    "NO_LOCAL_CONFIG": "true",
                    "NODE_ENV": "test"})
        self.node_app = subprocess.Popen(cmd, env=env)
        self.addCleanup(kill_app, self.node_app)
        self.drvr = driver.create()
        self.drvr.implicitly_wait(20)

    def tearDown(self):
        self.drvr.quit()
        kill_app(self.node_app)

    def test_frontend_pages_for_zero_failures(self):
        for url in TEST_URLS:
            self.drvr.get(url)
            self.drvr.find_element_by_id('complete')
            failNode = self.drvr.find_element_by_css_selector('.failures > em')
            assert failNode.text == "0"


if __name__ == "__main__":
    unittest.main(catchbreak=True)
