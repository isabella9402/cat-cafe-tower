# -*- coding: utf-8 -*-
"""Tiny static dev server that sends no-store headers so the browser always
fetches fresh JS/assets (avoids stale-cache during preview testing)."""
import http.server, socketserver, os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))  # project root

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", 8177), Handler) as httpd:
    print("no-cache dev server on :8177")
    httpd.serve_forever()
