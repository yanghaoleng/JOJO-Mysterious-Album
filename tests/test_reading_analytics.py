import importlib.util,json,sqlite3,tempfile,time,unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).parents[1]))
spec=importlib.util.spec_from_file_location('app',Path(__file__).parents[1]/'serve.py');app=importlib.util.module_from_spec(spec);spec.loader.exec_module(app)
class ReadingAnalytics(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();app.ANALYTICS_DB=Path(self.temp.name)/'analytics.db';app.analytics_user_id=lambda handler:''
  # Simulate the production schema before promotion, with a historical festival row.
  with sqlite3.connect(app.ANALYTICS_DB) as c:
   c.execute("CREATE TABLE word_attempts(attempt_id TEXT PRIMARY KEY,visitor_id TEXT NOT NULL,session_id TEXT NOT NULL,user_id TEXT NOT NULL DEFAULT '',chapter TEXT NOT NULL DEFAULT 'words',age INTEGER NOT NULL,lesson_id TEXT NOT NULL,lesson_index INTEGER NOT NULL DEFAULT 0,mode TEXT NOT NULL DEFAULT '',input_source TEXT NOT NULL DEFAULT 'voice',attempted_at INTEGER NOT NULL,correct INTEGER NOT NULL DEFAULT 0,passed INTEGER NOT NULL DEFAULT 0,coverage REAL NOT NULL DEFAULT 0,target_count INTEGER NOT NULL DEFAULT 0,matched_count INTEGER NOT NULL DEFAULT 0)")
   c.execute("INSERT INTO word_attempts(attempt_id,visitor_id,session_id,chapter,age,lesson_id,attempted_at) VALUES('legacy001','visitor1','session1','words',6,'midautumn-middle-1',?)",(int(time.time()*1000),))
  app.init_analytics();app.init_analytics()
 def tearDown(self):self.temp.cleanup()
 def payload(self,activity,index=0):return dict(attemptId='attempt-'+activity,visitorId='visitor1',sessionId='session1',chapter=activity,age=5 if activity=='words' else None,lessonId={'words':'animals-early-r1-1','midautumn':'midautumn-middle-1','national-day':'national-day-finale-story'}[activity],lessonIndex=index,coverage=1,correct=True,passed=True,inputSource='menu',theme=activity,routeIndex=2,runId='run-test-001',targetCount=3,matchedCount=3)
 def event(self,name,activity,index=0,run='run-test-001'):
  with app.analytics_connection() as c:
   c.execute('INSERT INTO interaction_events(event_id,visitor_id,session_id,user_id,view_id,page,chapter,event_name,occurred_at,depth,properties_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)',(name+activity+str(index)+run,'visitor1','session1','','pageview1',activity,activity,name,int(time.time()*1000),1,json.dumps(dict(activity=activity,age=None if activity!='words' else 5,lessonIndex=index,lessonId='national-day-finale-story' if activity=='national-day' else 'animals-early-r1-1',theme=activity,routeIndex=2,runId=run))))
 def test_three_activities_and_legacy(self):
  for activity in app.READING_ACTIVITIES:
   payload=self.payload(activity,95 if activity=='national-day' else 0);app.collect_word_analytics(payload,None);app.collect_word_analytics(payload,None)
  self.event('word_lesson_start','national-day',95);self.event('chapter_start','national-day');self.event('chapter_complete','national-day',95);self.event('chapter_complete','national-day',94)
  with app.analytics_connection() as c:
   national=app.word_analytics_summary(c,0,'national-day');words=app.word_analytics_summary(c,0);mid=app.word_analytics_summary(c,0,'midautumn')
   self.assertEqual(national['totals']['avg_depth'],96);self.assertEqual(national['totals']['avg_progress'],1);self.assertEqual(national['totals']['completed_runs'],1);self.assertEqual(len(national['stages']),96)
   self.assertEqual(national['stages'][95]['answer_attempts'],1);self.assertEqual(national['ages'],[]);self.assertEqual(mid['ages'],[])
   self.assertEqual(words['totals']['answer_attempts'],1);self.assertEqual(mid['totals']['answer_attempts'],2);self.assertEqual(c.execute("SELECT age FROM word_attempts WHERE chapter='national-day'").fetchone()[0],0)
   self.assertEqual(app.word_analytics_summary(c,int(time.time()*1000)+1000)['totals']['answer_attempts'],0)
 def test_invalid_inputs(self):
  for key,value in [('chapter','arbitrary'),('lessonIndex',96),('routeIndex',4),('runId','<script>'),('coverage',float('nan'))]:
   p=self.payload('national-day');p[key]=value
   with self.assertRaises(ValueError,msg=key):app.collect_word_analytics(p,None)
  p=self.payload('words');p['age']=None
  with self.assertRaises(ValueError):app.collect_word_analytics(p,None)
 def test_properties_no_raw_text(self):
  props=json.loads(app.event_properties(dict(activity='national-day',theme='national-day',lessonIndex=95,runId='run-test-001',transcript='private',age=None)))
  self.assertEqual(props['lessonIndex'],95);self.assertNotIn('transcript',props);self.assertNotIn('age',props)
if __name__=='__main__':unittest.main()
