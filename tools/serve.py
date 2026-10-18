# Dev server: like `python -m http.server`, but with no-cache headers so edited modules always reload.
import http.server, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

import functools, os
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
root = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')   # default: project root
http.server.ThreadingHTTPServer(('', port), functools.partial(NoCache, directory=root)).serve_forever()
