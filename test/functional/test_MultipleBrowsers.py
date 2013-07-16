#!/usr/bin/env python
# -*- coding: utf-8 -*-

import mixins
import unittest
import BrowserTest


class MultipleBrowsersTest(mixins.WithBob, mixins.WithLarry,
                           BrowserTest.BrowserTest):
    def test_signin_users(self):
        # Sign in user 1
        self.bob.signin()
        self.assertSignedInAs(self.bob, "bob")

        # Check there is a message that this is the only person logged in
        self.assertElementTextContains(self.bob, ".alert-info", "only person")

        # Sign in user 2
        self.larry.signin()
        self.assertSignedInAs(self.larry, "larry")

        # Check that both pages no longer have the alert on them
        self.assertElementsCount(self.bob, ".alert-info", 0)
        self.assertElementsCount(self.larry, ".alert-info", 0)

        # Sign out user 1
        self.bob.signout()
        self.assertElementsCount(self.bob, ".alert-info", 0)

        # Check there's an alert on user 2's screen
        self.assertElementTextContains(self.larry, ".alert-info",
                                       "only person")

        # Now sign out user 2
        self.larry.signout()
        self.assertElementsCount(self.bob, ".alert-info", 0)
        self.assertSignedOut(self.larry)

    def test_chat_window(self):
        # Sign both users in
        self.bob.signin()
        self.larry.signin()

        # Bob calls Larry
        self.bob.openConversationWith("larry")

    def test_video_call(self):
        # Sign both users in
        self.bob.signin()
        self.larry.signin()

        # Bob calls Larry and initiates a video call in the chat window
        self.bob.openConversationWith("larry").startCall(True)
        self.assertPendingCall(self.bob)

        # Larry gets a conversation window and accepts the incoming call
        self.larry.switchToChatWindow()
        self.assertIncomingCall(self.larry)
        self.larry.acceptCall()

        # Both Larry and Bob now have an ongoing call
        self.assertOngoingCall(self.bob)
        self.assertOngoingCall(self.larry)

    def test_text_chat(self):
        self.larry.signin()
        self.bob.signin()

        # Bob sends a message to Larry
        self.bob.openConversationWith("larry").sendChatMessage("hi!")
        self.assertChatMessageExists(self.bob, "hi!", item=1)
        self.assertChatMessageExists(self.larry, "hi!", item=1)

        # Larry sends a message to Bob
        self.larry.sendChatMessage("yay!")
        self.assertChatMessageExists(self.bob, "yay!", item=2)
        self.assertChatMessageExists(self.larry, "yay!", item=2)

        # Bob replies to Larry
        self.bob.sendChatMessage("ok")
        self.assertChatMessageExists(self.bob, "ok", item=3)
        self.assertChatMessageExists(self.larry, "ok", item=3)

if __name__ == "__main__":
    unittest.main(catchbreak=True)
