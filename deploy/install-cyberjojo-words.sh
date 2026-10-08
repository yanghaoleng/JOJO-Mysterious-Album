#!/usr/bin/env bash
set -euo pipefail
: "${RELEASE_TAG:?RELEASE_TAG is required}"
[[ "$RELEASE_TAG" =~ ^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$ && "$RELEASE_TAG" != *..* ]]
previous="$(readlink -f /opt/kindergrimm/current)"
release="/opt/kindergrimm/releases/$RELEASE_TAG"
config=/etc/nginx/sites-enabled/jma.mikeywa.site
snippet=/etc/nginx/snippets/cyberjojo-words-frame.conf
backup="/tmp/jma-nginx-$RELEASE_TAG.backup"
test -f "$previous/words.html"
test ! -e "$release"
mkdir -p "$release"
tar -xzf "/tmp/jma-$RELEASE_TAG.tar.gz" -C "$release"
test -s "$release/words.html"
test -s "$release/dev/words.bundle.js"
# This release only changes the static experience; the API process stays on its current code.
cmp "$previous/serve.py" "$release/serve.py"
cp -L "$config" "$backup"
had_snippet=0
if test -f "$snippet"; then had_snippet=1; cp "$snippet" "$backup.snippet"; fi
rollback() {
  trap - ERR
  cp "$backup" "$config"
  if ((had_snippet)); then cp "$backup.snippet" "$snippet"; else rm -f "$snippet"; fi
  ln -sfn "$previous" /opt/kindergrimm/current.rollback
  mv -Tf /opt/kindergrimm/current.rollback /opt/kindergrimm/current
  nginx -t && systemctl reload nginx
  echo "Restored JMA static release $previous" >&2
  exit 1
}
trap rollback ERR
cp "$release/deploy/cyberjojo-words-frame.conf" "$snippet"
if ! grep -q 'include /etc/nginx/snippets/cyberjojo-words-frame.conf;' "$config"; then
  sed -i '/root \/opt\/kindergrimm\/current;/a\    include /etc/nginx/snippets/cyberjojo-words-frame.conf;' "$config"
fi
nginx -t
ln -sfn "$release" /opt/kindergrimm/current.next
mv -Tf /opt/kindergrimm/current.next /opt/kindergrimm/current
systemctl reload nginx
curl --fail --silent --show-error --resolve jma.mikeywa.site:443:127.0.0.1 https://jma.mikeywa.site/words >/dev/null
curl --fail --silent --show-error --resolve jma.mikeywa.site:443:127.0.0.1 https://jma.mikeywa.site/dev/words.bundle.js >/dev/null
trap - ERR
echo "Released JMA $RELEASE_TAG; previous: $previous"
