# -*- coding: utf-8 -*-
"""Tiny static dev server that sends no-store headers so the browser always
fetches fresh JS/assets (avoids stale-cache during preview testing)."""
import http.server, socketserver, os, sys

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))  # project root

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

# port precedence: CLI arg -> PORT env (autoPort) -> default 8177
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", "8177"))

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print("no-cache dev server on :%d" % PORT)
    httpd.serve_forever()
