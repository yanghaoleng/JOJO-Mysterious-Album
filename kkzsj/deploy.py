"""Run with sudo on the mikeywa.site host after uploading a prepared release."""
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import sqlite3
import subprocess
import sys
import tarfile


def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True)


archive, release_id = sys.argv[1:]
assert re.fullmatch(r'[0-9]{8}-kkzsj-[0-9a-f]{7,12}', release_id)
root = Path('/opt/kkzsj')
release = root / 'releases' / release_id
release.mkdir(parents=True, exist_ok=False)
with tarfile.open(archive, 'r:gz') as tar:
    tar.extractall(release, filter='data')
run('chmod', '-R', 'a+rX', str(release))
assert (release / 'kkzsj/index.html').is_file()
history = json.loads((release / 'changelog/history.json').read_text())
assert history['revision'].startswith(release_id.rsplit('-', 1)[1])
config = Path('/etc/nginx/sites-enabled/mikeywa.site').resolve()
before = config.read_bytes()
backup = Path('/var/backups') / ('kkzsj-nginx-' + release_id)
assert not backup.exists()
backup.write_bytes(before)
os.chmod(backup, 0o600)
current = root / 'current'
previous = current.resolve() if current.exists() else None
state = Path('/var/lib/kkzsj/analytics.db')
if state.exists():
    db_backup = '/var/backups/kkzsj-db-' + release_id + '.db'
    with sqlite3.connect(state) as source, sqlite3.connect(db_backup) as target:
        source.backup(target)
    os.chmod(db_backup, 0o600)
env = Path('/etc/kkzsj.env')
if not env.exists():
    env.write_text('DATA_SESSION_SECRET=' + secrets.token_urlsafe(48) + '\nDATA_ADMIN_PASSWORD=997118\nKKZSJ_MOCK_LOGIN=1\n')
    os.chmod(env, 0o600)
for source, destination in [('kkzsj/nginx.conf','/etc/nginx/snippets/kkzsj.conf'), ('kkzsj/speech-proxy.conf','/etc/nginx/snippets/kkzsj-speech-proxy.conf'), ('kkzsj/kkzsj.service','/etc/systemd/system/kkzsj.service')]:
    shutil.copyfile(release / source, destination)
text = before.decode()
if 'include /etc/nginx/snippets/kkzsj.conf;' not in text:
    anchor = 'root /var/www/mikeywa-site/current;'
    assert text.count(anchor) == 1
    config.write_text(text.replace(anchor, anchor + '\n    include /etc/nginx/snippets/kkzsj.conf;'))
try:
    run('nginx', '-t')
    link = root / 'current.next'
    link.symlink_to(release)
    os.replace(link, current)
    run('systemctl', 'daemon-reload')
    run('systemctl', 'enable', '--now', 'kkzsj.service')
    if previous:
        run('systemctl', 'restart', 'kkzsj.service')
    result = run('curl', '--fail', '--silent', '--retry', '10', '--retry-connrefused', '--retry-delay', '1', 'http://127.0.0.1:8854/kkzsj/api/health')
    assert json.loads(result.stdout)['edition'] == 'kkzsj'
    run('systemctl', 'reload', 'nginx')
    print(json.dumps({'release':str(release),'previous':str(previous) if previous else None,'service':run('systemctl','is-active','kkzsj.service').stdout.strip(),'nginxBackup':str(backup)}))
except Exception:
    config.write_bytes(before)
    if previous:
        link = root / 'current.rollback'
        link.symlink_to(previous)
        os.replace(link, current)
        run('systemctl', 'restart', 'kkzsj.service')
    else:
        run('systemctl', 'disable', '--now', 'kkzsj.service')
    run('nginx', '-t')
    run('systemctl', 'reload', 'nginx')
    raise
