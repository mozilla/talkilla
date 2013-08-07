# -*- coding: utf-8 -*-

import driver


# WithSingleBob runs a single instance of the browser over the
# entire set of tests in a class. This should become the default
# in future.
class WithSingleBob(object):
    @classmethod
    def setUpClass(cls):
        super(WithSingleBob, cls).setUpClass()
        cls.bob = driver.create("bob")

    @classmethod
    def tearDownClass(cls):
        super(WithSingleBob, cls).tearDownClass()
        cls.bob.quit()


# WithBob and WithLarry run a new instance of the browser for each
# test in a class.
class WithBob(object):
    def setUp(self):
        super(WithBob, self).setUp()
        self.bob = driver.create("bob")

    def tearDown(self):
        super(WithBob, self).tearDown()
        self.bob.quit()


class WithLarry(object):
    def setUp(self):
        super(WithLarry, self).setUp()
        self.larry = driver.create("larry")

    def tearDown(self):
        super(WithLarry, self).tearDown()
        self.larry.quit()
