#!/usr/bin/env python
# -*- coding: utf-8 -*-

import mixins
import unittest
import time

from browser_test import MultipleNodeBrowserTest, debug_on  # NOQA
from config import testConfig


class MultipleBrowsersTest(mixins.WithBob, mixins.WithLarry, mixins.WithAlice,
                           MultipleNodeBrowserTest):

    def test_audio_only_call(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry").startCall(False)
        self.assertPendingOutgoingCall(self.bob)

        self.bob.switchToChatWindow("larry")
        self.larry.switchToChatWindow("bob")

        self.assertIncomingCall(self.larry)
        self.larry.acceptCall()
        self.assertElementNotVisible(self.larry, ".incoming-text")

        self.assertCallMediaPlaying(self.bob)
        self.assertCallMediaPlaying(self.larry)

        self.assertElementVisibleAndInView(self.bob, "#textchat")
        self.assertElementVisibleAndInView(self.larry, "#textchat")

        self.bob.hangupCall()

    def test_callback_after_timeout(self):
        self.larry.signin()
        self.bob.signin()

        self.bob.openConversationWith("larry").startCall(True)
        self.assertPendingOutgoingCall(self.bob)

        self.larry.switchToChatWindow("bob")
        self.assertIncomingCall(self.larry)

        self.assertCallTimedOut(self.bob)

        # Now try calling back
        self.larry.openConversationWith("bob").startCall(True)
        self.assertPendingOutgoingCall(self.larry)

        self.bob.switchToChatWindow("larry")
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
        self.assertElementsCount(self.bob, ".user", 1)
        self.assertElementsCount(self.larry, ".user", 1)

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

        self.larry.switchToChatWindow("bob")
        self.assertIncomingCall(self.larry)
        assert self.larry.title == "bob"
        self.larry.acceptCall()

        self.assertOngoingCall(self.bob)
        self.assertOngoingCall(self.larry)

        self.bob.hangupCall()
        self.assertChatWindowClosed(self.larry, "bob")

    def test_video_call_timeout(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry").startCall(True)
        self.assertPendingOutgoingCall(self.bob)

        self.larry.switchToChatWindow("bob")
        self.assertIncomingCall(self.larry)

        self.assertCallTimedOut(self.bob)
        self.assertChatWindowClosed(self.larry, "bob")

    def test_video_call_timeout_and_retry(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry").startCall(True)
        self.assertPendingOutgoingCall(self.bob)

        self.larry.switchToChatWindow("bob")
        self.assertIncomingCall(self.larry)

        self.assertCallTimedOut(self.bob)

        # Now try calling a second time
        self.bob.restartCall()
        self.assertPendingOutgoingCall(self.bob)

        self.larry.switchToChatWindow("bob")
        self.assertIncomingCall(self.larry)
        self.larry.acceptCall()

        self.assertOngoingCall(self.bob)
        self.assertOngoingCall(self.larry)

    def test_video_call_ignored(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry").startCall(True)
        self.assertPendingOutgoingCall(self.bob)

        self.larry.switchToChatWindow("bob")
        self.larry.ignoreCall()

        self.assertCallTimedOut(self.bob)

    def test_video_call_late_hangup(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry").startCall(True)

        self.larry.switchToChatWindow("bob")
        self.larry.ignoreCall()
        # Wait for the ignore to finish and the window to close
        time.sleep(testConfig['CONVERSATION_IGNORE_DISPLAY_TIME'] / 1000)
        self.assertChatWindowClosed(self.larry, "bob")

        self.larry.openConversationWith("bob")
        self.assertCallTimedOut(self.bob)
        self.assertChatWindowOpen(self.larry, "bob")

    def test_text_chat(self):
        self.larry.signin()
        self.bob.signin()

        self.bob.openConversationWith("larry").typeChatMessage("hi!", "larry",
                                                               send=True)
        self.assertChatMessageContains(self.bob, "hi!", "larry", line=1)
        self.assertChatMessageContains(self.larry, "hi!", "bob", line=1)

        self.larry.typeChatMessage("yay!", "bob", send=True)
        self.assertChatMessageContains(self.bob, "yay!", "larry", line=2)
        self.assertChatMessageContains(self.larry, "yay!", "bob", line=2)

        self.bob.typeChatMessage("ok", "larry", send=True)
        self.assertChatMessageContains(self.bob, "ok", "larry", line=3)
        self.assertChatMessageContains(self.larry, "ok", "bob", line=3)

    def test_presence_icon(self):
        self.larry.signin()
        self.bob.signin()

        self.bob.openConversationWith("larry")
        self.assertConversationPresenceIconShows(self.bob, "connected")

        self.larry.signout()
        self.assertConversationPresenceIconShows(self.bob, "disconnected")

    def test_message_placeholder(self):
        self.larry.signin()
        self.bob.signin()

        self.bob.openConversationWith("larry")
        self.assertMessagePlaceholderEquals(self.bob,
                                            "Type something to start chatting",
                                            "larry")

        self.bob.typeChatMessage("wazza", "larry", send=True)
        self.assertMessagePlaceholderEquals(self.bob, "", "larry")

        self.bob.closeConversationWindow()
        self.bob.openConversationWith("larry")
        self.assertMessagePlaceholderEquals(self.bob, "", "larry")

    def test_local_video_visible_to_call_upgrader(self):
        self.bob.signin()
        self.larry.signin()

        self.bob.openConversationWith("larry").typeChatMessage("let's chat!",
                                                               "larry",
                                                               send=True)

        self.larry.switchToChatWindow("bob").startCall(True)

        self.bob.acceptCall()

        self.assertElementVisible(self.larry, "#local-media")

        self.bob.hangupCall()
        self.assertChatWindowClosed(self.larry, "bob")

    def test_contact_is_typing(self):
        self.larry.signin()
        self.bob.signin()

        self.larry.openConversationWith("bob")
        self.bob.openConversationWith("larry").typeChatMessage("Hey Buddy!",
                                                               "larry",
                                                               send=True)

        self.waitForNewMessageReceived(self.larry, "bob")
        self.bob.typeChatMessage("wazzza", "larry")
        self.assertIsTyping(self.larry, "bob")

        self.assertNotTyping(self.larry, "bob")

    def test_multi_user_chat(self):
        self.larry.signin()
        self.bob.signin()
        self.alice.signin()

        self.bob.openConversationWith("larry").typeChatMessage("hi!", "larry",
                                                               send=True)
        self.assertChatMessageContains(self.bob, "hi!", "larry", line=1)
        self.assertChatMessageContains(self.larry, "hi!", "bob", line=1)

        self.bob.openConversationWith("alice").typeChatMessage("yo!", "alice",
                                                               send=True)
        self.assertChatMessageContains(self.bob, "yo!", "alice", line=1)
        self.assertChatMessageContains(self.alice, "yo!", "bob", line=1)

    def test_instant_share(self):
        # save this so we have a normal browser context to view the link
        original_window_handle = self.bob.current_window_handle

        self.larry.signin()
        self.bob.signin()

        # get the instant share link from larry
        self.larry.switchToSidebar()
        instant_share_link = self.getInstantShareLink(self.larry)

        # load the link in bob's original browser window
        self.bob.switch_to_window(original_window_handle)
        self.bob.get(instant_share_link)
        self.bob.find_element_by_css_selector("a.call-button").click()

        self.bob.switchToChatWindow("larry")
        self.assertPendingOutgoingCall(self.bob)

        self.larry.switchToChatWindow("bob")
        self.assertIncomingCall(self.larry)
        self.larry.acceptCall()

        self.assertOngoingCall(self.bob)
        self.assertOngoingCall(self.larry)

        self.bob.hangupCall()
        self.assertChatWindowClosed(self.larry, "bob")

if __name__ == "__main__":
    unittest.main(catchbreak=True)
