import json
import struct
import unittest
from unittest.mock import patch
from volc_realtime import packet, unpack, session_config, connect, paced_reading_text
from volc_asr import speech_hotwords, transcribe_pcm, transcribe_pcm

class RealtimeProtocolTest(unittest.TestCase):
    def test_client_audio_and_session_frame(self):
        raw = packet(200, b'\x00\x01', 'demo')
        self.assertEqual(raw[:4], b'\x11\x24\x00\x00')
        self.assertEqual(struct.unpack('>II', raw[4:12]), (200, 4))
        self.assertEqual(raw[12:16], b'demo')
        self.assertEqual(raw[-6:], b'\x00\x00\x00\x02\x00\x01')
    def test_server_events_and_audio(self):
        for event, body, serial in [(50, {}, 1), (451, {'results':[{'text':'DOMI','is_interim':False}]}, 1), (352, b'\x01\x00', 0)]:
            data = json.dumps(body).encode() if serial else body
            raw = bytes((0x11, 0x94 if serial else 0xb4, serial << 4, 0)) + struct.pack('>II',event,3)+b'abc'+struct.pack('>I',len(data))+data
            self.assertEqual(unpack(raw),(event,body))
    def test_legacy_hotwords_reach_provider(self):
        import gzip
        from unittest.mock import MagicMock
        connection=MagicMock()
        connection.receive_binary.return_value=b'ignored'
        with patch.dict('os.environ', {'VOLC_SPEECH_APP_ID':'test','VOLC_SPEECH_ACCESS_TOKEN':'test','VOLC_SPEECH_RESOURCE_ID':'test'}), patch('volc_asr._WebSocket', return_value=connection), patch('volc_asr._parse_response',return_value={'last':True,'message':{'result':{'text':'DOMI'}}}):
            self.assertEqual(transcribe_pcm(bytes(3200)),'DOMI')
        payload=json.loads(gzip.decompress(connection.send_binary.call_args_list[0].args[0][12:]))
        hotwords=json.loads(payload['request']['corpus']['context'])['hotwords']
        self.assertIn({'word':'DOMI'},hotwords)
        connection.close.assert_called_once()

    def test_unified_api_key_takes_precedence(self):
        with patch.dict('os.environ', {'VOLC_REALTIME_API_KEY':'unit-test-key', 'VOLC_SPEECH_APP_ID':'old-app', 'VOLC_SPEECH_ACCESS_TOKEN':'old-token'}), patch('volc_realtime._WebSocket') as socket:
            connect()
        headers=socket.call_args.args[1]
        self.assertEqual(headers['X-Api-Key'],'unit-test-key')
        self.assertNotIn('X-Api-Access-Key',headers)
        self.assertNotIn('X-Api-App-ID',headers)
        self.assertEqual(session_config()['dialog']['extra']['input_mod'],'keep_alive')

    def test_live_reading_returns_real_wav_container(self):
        import io, wave
        from unittest.mock import MagicMock
        from volc_realtime import realtime_reading_audio
        ws=MagicMock()
        with patch('volc_realtime.connect',return_value=ws), patch('volc_realtime.unpack',side_effect=[(50,{}),(150,{}),(350,{'text':''}),(352,b'\x01\x00'*2400),(359,{})]):
            data=realtime_reading_audio('你好，我是叫叫。','star')
        with wave.open(io.BytesIO(data)) as audio:
            self.assertEqual(audio.getframerate(),24000)
            self.assertEqual(audio.getnframes(),2400)
        calls=ws.send_binary.call_args_list
        self.assertIn('zh_male_xiaotian_jupiter_bigtts',calls[1].args[0].decode('utf8',errors='ignore'))
        self.assertIn('你好，我是叫叫。',calls[2].args[0].decode('utf8',errors='ignore'))
        ws.close.assert_called_once()

    def test_word_pauses_preserve_complete_prompt(self):
        self.assertEqual(paced_reading_text('Big blue head.'),'Big, blue, head.')
        self.assertEqual(paced_reading_text('head'),'head')
        self.assertEqual(paced_reading_text('苹果的英文怎么说？'),'苹果的英文怎么说？')
        self.assertIn('Chinese opening',session_config()['dialog']['system_role'])

    def test_bad_frames(self):
        for data in [b'', b'\x11\xf0\x10\x00'+struct.pack('>I',45000003)]:
            with self.assertRaises((ValueError,RuntimeError)):unpack(data)
    def test_hotwords_and_english_policy(self):
        words = [w['word'] for w in speech_hotwords()]
        for name in ['JOJO','BOBO','DOMI','head','ball','box']:self.assertIn(name,words)
        config = session_config('A big head.')
        self.assertTrue(config['asr']['extra']['enable_asr_twopass'])
        self.assertEqual(config['asr']['extra']['context']['hotwords'],speech_hotwords())
        self.assertIn('ONLY English',config['dialog']['system_role'])
        self.assertEqual(config['tts']['audio_config']['format'],'pcm_s16le')
        self.assertIn('gentle female', config['dialog']['speaking_style'])
        self.assertEqual(config['tts']['audio_config']['speech_rate'], -20)
        self.assertEqual(session_config('', 'onboarding')['tts']['audio_config']['speech_rate'], -10)
        self.assertIn('young child voice', session_config('', 'onboarding')['dialog']['speaking_style'])

if __name__ == '__main__':unittest.main()
