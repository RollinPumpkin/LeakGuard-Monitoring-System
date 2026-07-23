import urllib.request
import urllib.parse
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def search(q):
    url = f"https://api.semanticscholar.org/graph/v1/paper/search?query={urllib.parse.quote(q)}&limit=3&fields=title,authors,year,url"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req, context=ctx)
    data = json.loads(resp.read())
    for p in data.get('data', []):
        if p.get('year') and p['year'] >= 2020:
            title = p.get('title')
            authors = [a['name'] for a in p.get('authors', [])]
            year = p.get('year')
            url_link = p.get('url')
            print(f"Title: {title}")
            print(f"Authors: {', '.join(authors)}")
            print(f"Year: {year}")
            print(f"URL: {url_link}")
            print("-" * 40)
            break

print("=== PAPER 1: Same Algo, Diff Method ===")
search("time series forecasting battery health")

print("\n=== PAPER 2: Diff Algo, Same Method ===")
search("leakage current insulator machine learning")
