# Dev server: like `python -m http.server`, but with no-cache headers so edited modules always reload.
# POST /__shot?name=x with a PNG body saves it to .tmp/shots/x.png (full-res canvas captures for review).
import http.server, sys, re

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def do_POST(self):
        m = re.match(r'^/__shot\?name=([\w-]{1,40})$', self.path)
        if not m or self.client_address[0] not in ('127.0.0.1', '::1'):
            self.send_error(404); return
        n = int(self.headers.get('Content-Length', 0))
        if n <= 0 or n > 40_000_000:
            self.send_error(413); return
        d = os.path.join(root, '.tmp', 'shots'); os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, m.group(1) + '.png'), 'wb') as f: f.write(self.rfile.read(n))
        self.send_response(204); self.end_headers()

import functools, os
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
root = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')   # default: project root
http.server.ThreadingHTTPServer(('', port), functools.partial(NoCache, directory=root)).serve_forever()
