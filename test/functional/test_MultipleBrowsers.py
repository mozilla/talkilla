#!/usr/bin/env python
# -*- coding: utf-8 -*-

import mixins
import unittest

from browser_test import BrowserTest


class MultipleBrowsersTest(mixins.WithBob, mixins.WithLarry, BrowserTest):
    def test_signin_users(self):
        self.bob.signin()
        self.assertSignedInAs(self.bob, "bob")

        self.assertElementTextContains(self.bob, ".alert-info", "only person")

        self.larry.signin()
        self.assertSignedInAs(self.larry, "larry")

        self.assertElementsCount(self.bob, ".alert-info", 0)
        self.assertElementsCount(self.larry, ".alert-info", 0)

        self.bob.signout()
        self.assertElementsCount(self.bob, ".alert-info", 0)

        self.assertElementTextContains(self.larry, ".alert-info",
                                       "only person")

        self.larry.signout()
        self.assertElementsCount(self.bob, ".alert-info", 0)
        self.assertSignedOut(self.larry)

    def test_chat_window(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry")

    def test_video_call(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry").startCall(True)
        self.assertPendingOutgoingCall(self.bob)

        self.larry.switchToChatWindow()
        self.assertIncomingCall(self.larry)
        self.larry.acceptCall()

        self.assertOngoingCall(self.bob)
        self.assertOngoingCall(self.larry)

    def test_text_chat(self):
        self.larry.signin()
        self.bob.signin()

        self.bob.openConversationWith("larry").sendChatMessage("hi!")
        self.assertChatMessageContains(self.bob, "hi!", line=1)
        self.assertChatMessageContains(self.larry, "hi!", line=1)

        self.larry.sendChatMessage("yay!")
        self.assertChatMessageContains(self.bob, "yay!", line=2)
        self.assertChatMessageContains(self.larry, "yay!", line=2)

        self.bob.sendChatMessage("ok")
        self.assertChatMessageContains(self.bob, "ok", line=3)
        self.assertChatMessageContains(self.larry, "ok", line=3)

if __name__ == "__main__":
    unittest.main(catchbreak=True)
