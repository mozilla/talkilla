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
    'port/index.html',
    'sidebar/index.html',
    'webrtc/index.html',
    'worker/index.html'
]]


class FrontEndSuite(unittest.TestCase):
    def setUp(self):
        super(FrontEndSuite, self).setUp()
        app_cmd = 'PORT=3000 NODE_ENV=test node app.js'
        self.node_app = subprocess.Popen(app_cmd, stdout=subprocess.PIPE,
                                         shell=True, preexec_fn=os.setsid)
        self.drvr = driver.create()
        self.drvr.implicitly_wait(20)

    def tearDown(self):
        self.drvr.quit()
        os.killpg(self.node_app.pid, signal.SIGTERM)
        self.node_app.kill()
        # ps aux|grep "node app"|grep -v grep|awk '{print $2}'|xargs kill

    def test_frontend_pages_for_zero_failures(self):
        for url in TEST_URLS:
            self.drvr.get(url)
            self.drvr.find_element_by_id('complete')
            failNode = self.drvr.find_element_by_css_selector('.failures > em')
            assert failNode.text == "0", "Failed frontend tests in %s" % url


if __name__ == "__main__":
    unittest.main(catchbreak=True)
