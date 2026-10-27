import http.client
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from . import server


class Accounts(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        server.serve.ANALYTICS_DB = Path(self.temp.name) / 'independent.db'
        server.init()
        self.http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        threading.Thread(target=self.http.serve_forever, daemon=True).start()
        self.port = self.http.server_address[1]

    def tearDown(self):
        self.http.shutdown()
        self.http.server_close()
        self.temp.cleanup()

    def request(self, path, data=None, cookie='', origin=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.port)
        headers = {'Content-Type':'application/json', 'Cookie':cookie}
        if origin:
            headers['Origin'] = origin
        connection.request('GET' if data is None else 'POST', '/kkzsj/api/' + path, None if data is None else json.dumps(data), headers)
        response = connection.getresponse()
        self.last_headers = dict(response.getheaders())
        code, token, body = response.status, response.getheader('Set-Cookie'), json.loads(response.read())
        connection.close()
        return code, (token or '').split(';')[0], body

    def test_uid_sessions_progress_and_login(self):
        code, cookie, a = self.request('session', {})
        self.assertEqual(code, 201)
        self.assertIn('no-store', self.last_headers['Cache-Control'])
        self.assertNotIn('public', self.last_headers['Cache-Control'])
        self.assertRegex(a['user']['uid'], r'^[A-Z0-9]{3}$')
        self.assertTrue(any(c.isalpha() for c in a['user']['uid']))
        self.assertTrue(any(c.isdigit() for c in a['user']['uid']))
        self.assertEqual(self.request('session', {}, cookie)[2]['user'], a['user'])
        _, other_cookie, b = self.request('session', {})
        self.assertNotEqual(a['user']['uid'], b['user']['uid'])
        self.assertEqual(self.request('login/mock', {}, cookie)[0], 409)
        state = {'game':{'age':5,'journeys':{'early:animals':{'runId':'run-one','completed':True,'lessonIndex':5}}},'tour':{},'pending':{'age':5,'reset':False}}
        self.assertEqual(self.request('progress', {'state':state,'revision':0}, cookie)[0], 200)
        self.assertEqual(self.request('progress', {'state':state,'revision':0}, cookie)[0], 409)
        self.assertEqual(self.request('session', cookie=other_cookie)[2]['state'], {})
        self.assertEqual(self.request('session', cookie=cookie)[2]['state'], state)
        self.assertIn('no-store', self.last_headers['Cache-Control'])
        code, _, result = self.request('login/mock', {}, cookie)
        self.assertEqual(code, 200)
        self.assertEqual(result['user']['kind'], 'mock')
        self.assertEqual(result['user']['uid'], a['user']['uid'])
        self.assertFalse(result['user']['sdkConnected'])
        self.assertEqual(self.request('session', cookie=cookie)[2]['state'], state)
        self.assertEqual(self.request('session', cookie='kkzsj_session='+b['user']['uid'])[0], 401)
        self.assertEqual(self.request('data/accounts')[0], 401)
        self.assertEqual(self.request('data/login', {'code':'bad'})[0], 401)
        code, admin, _ = self.request('data/login', {'code':'997118'})
        self.assertEqual(code, 200)
        accounts = self.request('data/accounts', cookie=admin)[2]
        self.assertIn('no-store', self.last_headers['Cache-Control'])
        self.assertEqual(accounts['totals'], {'total':2,'mock_logins':1})
        self.assertEqual(next(u for u in accounts['users'] if u['uid']==a['user']['uid'])['completed_chapters'], 1)
        self.assertNotIn('state_json', json.dumps(accounts))
        self.assertEqual(self.request('data/summary', cookie='mengmeng_data_session='+admin.split('=',1)[1])[0], 401)
        self.assertEqual(self.request('data/summary', cookie=admin)[0], 200)

    def test_collision_and_origin(self):
        with patch.object(server.secrets, 'choice', side_effect=list('A1BA1BC2D')):
            a, _ = server.bootstrap('')
            b, _ = server.bootstrap('')
        self.assertEqual(a['uid'], 'A1B')
        self.assertEqual(b['uid'], 'C2D')
        self.assertEqual(self.request('session', {}, origin='https://untrusted.example')[0], 403)
        self.assertEqual(self.request('progress', {'state':{},'revision':0})[0], 401)
        with self.assertRaises(ValueError):
            server.validate_state({'uid':'A1B','game':{}})

    def test_metrics_bound_to_cookie(self):
        _, cookie, user = self.request('session', {})
        payload=dict(attemptId='attempt-test-001',visitorId='visitor-test-001',sessionId='session-test-001',chapter='words',age=5,lessonId='animals-early-route1-1',lessonIndex=0,coverage=1,correct=True,passed=True,inputSource='menu',theme='animals',routeIndex=0,runId='run-test-001',targetCount=1,matchedCount=1,userId='FAKE')
        self.assertEqual(self.request('analytics/word',payload,cookie)[0],202)
        with server.serve.analytics_connection() as db:
            self.assertEqual(db.execute('SELECT user_id FROM word_attempts').fetchone()[0],user['user']['uid'])
        self.assertEqual(self.request('analytics/word',payload)[0],401)


if __name__ == '__main__':
    unittest.main()
