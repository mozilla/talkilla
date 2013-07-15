#!/usr/bin/env python
# -*- coding: utf-8 -*-

import mixins
import unittest
import BrowserTest


class VideoCallTest(mixins.WithBob, mixins.WithLarry, BrowserTest.BrowserTest):
    def test_video_call(self):
        # Sign both users in
        self.bob.signin()
        self.larry.signin()

        # Bob opens Larry's conversation window
        self.bob.openConversation()

        # Bob calls Larry
        self.bob.startCall(True)

        # Bob sees the outgoing call
        assert self.bob.find_element_by_css_selector(
            ".outgoing-text").is_displayed()

        # Larry gets a window for receiving the call
        self.larry.switch_to_frame("//chatbox")

        # Larry accepts the call
        self.larry.acceptCall()

        # Larry sees the call
        assert self.larry.find_element_by_id("call").is_displayed()

        # Bob sees the call
        assert self.bob.find_element_by_id("call").is_displayed()


if __name__ == "__main__":
    try:
        unittest.main(verbosity=2)
    except KeyboardInterrupt:
        print "\nInterrupted."
