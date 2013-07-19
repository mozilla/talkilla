# -*- coding: utf-8 -*-

import driver


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
