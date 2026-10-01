#!/bin/bash
curl -s "http://localhost:3000/category/bangla" > curl_normal.html
curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" "http://localhost:3000/category/bangla" > curl_bot.html
diff curl_normal.html curl_bot.html || echo "Diff found"
