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


class FrontEndSuite(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # XXX: we should DRY-ify the server startup via python
        # scripts. For now we do that in:
        #   - test/frontend/test_frontend_all.py
        #   - test/functional/browser_test.py
        cmd = ("node", "app.js")
        env = os.environ.copy()
        env.update({"PORT": "3000",
                    "NO_LOCAL_CONFIG": "true",
                    "NODE_ENV": "test",
                    "SESSION_SECRET": "unguessable"})
        cls.node_app = subprocess.Popen(cmd, env=env)
        cls.drvr = driver.create()
        cls.drvr.implicitly_wait(20)

    @classmethod
    def tearDownClass(cls):
        cls.drvr.quit()
        os.kill(cls.node_app.pid, signal.SIGTERM)

    def check_page(self, url):
        self.drvr.get(url)
        self.drvr.find_element_by_id('complete')
        self.check_coverage()
        failNode = self.drvr.find_element_by_css_selector('.failures > em')
        if failNode.text == "0":
            return
        raise AssertionError(self.get_failure_details())

    def check_coverage(self):
        coverage = self.drvr.find_element_by_css_selector(
            '.grand-total .bl-cl.rs').text
        print("\n  Code coverage: %s" % coverage)

    def get_failure_details(self):
        fail_nodes = self.drvr.find_elements_by_css_selector('.test.fail')
        details = ["%d failure(s) encountered:" % len(fail_nodes)]
        for node in fail_nodes:
            details.append(
                node.find_element_by_tag_name('h2').text.split("\n")[0])
            details.append(
                node.find_element_by_css_selector('.error').text)
        return "\n".join(details)

    def test_index_html(self):
        self.check_page(SERVER_PREFIX + "index.html")

    def test_addressbook_index_html(self):
        self.check_page(SERVER_PREFIX + "addressbook/index.html")

    def test_chat_index_html(self):
        self.check_page(SERVER_PREFIX + "chat/index.html")

    def test_port_html(self):
        self.check_page(SERVER_PREFIX + "port/index.html")

    def test_sidebar_html(self):
        self.check_page(SERVER_PREFIX + "sidebar/index.html")

    def test_webrtc_index_html(self):
        self.check_page(SERVER_PREFIX + "webrtc/index.html")

    def test_worker_index_html(self):
        self.check_page(SERVER_PREFIX + "worker/index.html")

    def test_spa_index_html(self):
        self.check_page(SERVER_PREFIX + "spa/index.html")


if __name__ == "__main__":
    unittest.main(catchbreak=True)
