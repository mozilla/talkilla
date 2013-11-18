import gevent
import random
import os
import time
import json
import uuid

from loads.case import TestCase

from gevent import monkey
monkey.patch_all(httplib=True)
DEFAULT = 'ec2-54-237-86-107.compute-1.amazonaws.com'


class TestTalkilla(TestCase):

    root = 'http://%s/' % os.environ.get('AWS_SERVER', DEFAULT)

    def _signin(self, nick):
        # fake persona assertion for now
        data = {'assertion': nick}
        res = self._post_json('signin', data)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['nick'], nick)

        # we want to call presenceRequest & stream once
        data = {'nick': nick}
        res = self._post_json('presenceRequest', data)
        self.assertEqual(res.status_code, 204)
        self._stream(nick)

    def _signout(self, nick):
        data = {'nick': nick}
        res = self._post_json('signout', data)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json(), True)

    def _stream(self, nick):
        data = {'nick': nick}
        res = self._post_json('stream', data)
        self.assertEqual(res.status_code, 200)
        return res.json()

    def test_simple_signin(self):
        # signing in
        self._signin('user1')

        # calling /stream a few times
        for i in range(2):
            res = self._stream('user1')
            self.assertEqual(res, [])

        # bye !
        self._signout('user1')

    def _post_json(self, url, data):
        headers = {'Content-type': 'application/json'}
        return self.session.post(self.root + url, data=json.dumps(data),
                                 headers=headers)

    def _find_event(self, res, topic, peer):
        for line in res:
            if line['topic'] == topic and line['data']['peer'] == peer:
                return True
        return False

    def test_call(self):
        user1 = str(uuid.uuid4())
        user2 = str(uuid.uuid4())

        # signing in users
        self._signin(user1)
        self._signin(user2)

        # sending a call
        data = {'nick': user1, 'data': {'peer': user2}}
        res = self._post_json('calloffer', data)
        self.assertEqual(res.status_code, 204)

        # user2 accepts the call
        res = self._stream(user2)
        self.assertTrue(self._find_event(res, 'offer', user1))

        data = {'nick': user2, 'data': {'peer': user1}}
        res = self._post_json('callaccepted', data)
        self.assertEqual(res.status_code, 204)

        # user1 gets the ack
        res = self._stream(user1)
        self.assertTrue(self._find_event(res, 'answer', user2))

        # >>>> webrtc goodness here <<<<

        # user1 hang up
        data = {'nick': user1, 'data': {'peer': user2}}
        res = self._post_json('callhangup', data)
        self.assertEqual(res.status_code, 204)

        # user2 gets the ack
        res = self._stream(user2)
        self.assertTrue(self._find_event(res, 'hangup', user1))

        # bye !
        self._signout(user1)
        self._signout(user2)
