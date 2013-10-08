#!/usr/bin/env python
# -*- coding: utf-8 -*-

import mixins
import unittest

from browser_test import MultipleNodeBrowserTest


class MultipleBrowsersTest(mixins.WithBob, mixins.WithLarry,
                           MultipleNodeBrowserTest):

    def test_callback_after_timeout(self):
        self.larry.signin()
        self.bob.signin()

        self.bob.openConversationWith("larry").startCall(True)
        self.assertPendingOutgoingCall(self.bob)

        self.larry.switchToChatWindow()
        self.assertIncomingCall(self.larry)

        self.assertCallTimedOut(self.bob)

        # Now try calling back
        self.larry.openConversationWith("bob").startCall(True)
        self.assertPendingOutgoingCall(self.larry)

        self.bob.switchToChatWindow()
        self.assertIncomingCall(self.bob)
        self.bob.acceptCall()

        self.assertOngoingCall(self.bob)
        self.assertOngoingCall(self.larry)

    def test_signin_users(self):
        self.bob.signin()
        self.assertSignedInAs(self.bob, "bob")

        self.assertElementTextContains(self.bob, ".alert-info", "only person")

        self.larry.signin()
        self.assertSignedInAs(self.larry, "larry")

        self.assertElementsCount(self.bob, ".alert-info", 0)
        self.assertElementsCount(self.larry, ".alert-info", 0)
        self.assertElementsCount(self.bob, ".username", 1)
        self.assertElementsCount(self.larry, ".username", 1)

        self.bob.signout()
        self.assertElementsCount(self.bob, ".alert-info", 0)

        self.larry.signout()
        self.assertElementsCount(self.bob, ".alert-info", 0)
        self.assertSignedOut(self.larry)

    def test_chat_window(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry")
        assert self.bob.title == "larry"

    def test_video_call(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry").startCall(True)
        self.assertPendingOutgoingCall(self.bob)

        self.larry.switchToChatWindow()
        self.assertIncomingCall(self.larry)
        assert self.larry.title == "bob"
        self.larry.acceptCall()

        self.assertOngoingCall(self.bob)
        self.assertOngoingCall(self.larry)

        self.bob.hangupCall()

    def test_video_call_timeout(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry").startCall(True)
        self.assertPendingOutgoingCall(self.bob)

        self.larry.switchToChatWindow()
        self.assertIncomingCall(self.larry)

        self.assertCallTimedOut(self.bob)

    def test_video_call_timeout_and_retry(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry").startCall(True)
        self.assertPendingOutgoingCall(self.bob)

        self.larry.switchToChatWindow()
        self.assertIncomingCall(self.larry)

        self.assertCallTimedOut(self.bob)

        # Now try calling a second time
        self.bob.restartCall()
        self.assertPendingOutgoingCall(self.bob)

        self.larry.switchToChatWindow()
        self.assertIncomingCall(self.larry)
        self.larry.acceptCall()

        self.assertOngoingCall(self.bob)
        self.assertOngoingCall(self.larry)

    def test_video_call_ignored(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry").startCall(True)
        self.assertPendingOutgoingCall(self.bob)

        self.larry.switchToChatWindow()
        self.larry.ignoreCall()

        self.assertCallTimedOut(self.bob)

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

    def test_presence_icon(self):
        self.larry.signin()
        self.bob.signin()

        self.bob.openConversationWith("larry")
        self.assertPresenceIconConnected(self.bob)

        self.larry.signout()
        self.assertPresenceIconDisconnected(self.bob)

    def test_aaa_local_video_visible_to_upgrade_receiver(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry").sendChatMessage("let's chat!")

        self.larry.switchToChatWindow().startCall(True)

        self.bob.acceptCall()

        self.assertElementVisible(self.larry, "#local-video")


if __name__ == "__main__":
    unittest.main(catchbreak=True)
