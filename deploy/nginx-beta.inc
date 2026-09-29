# Include inside the existing jma server. Production root and backend stay unchanged.
location = /beta { return 302 /beta/$is_args$args; }
location = /beta/dev/words { return 302 /beta/$is_args$args; }
location = /beta/dev/words.html { return 302 /beta/$is_args$args; }
location = /beta/midautumn.html { return 302 /beta/midautumn$is_args$args; }
location ^~ /beta/ {
    location ~ (?:/\.|\.(?:py|sh|toml|md)$) { return 404; }
    root /opt/kindergrimm/beta-web;
    index index.html;
    try_files $uri $uri.html $uri/ =404;
    add_header Cache-Control "no-store, must-revalidate" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "microphone=(self), camera=(), geolocation=()" always;
}
