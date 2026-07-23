import urllib.request
import urllib.parse
from bs4 import BeautifulSoup
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def duckduckgo_search(query):
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req, context=ctx)
    html = resp.read()
    soup = BeautifulSoup(html, 'html.parser')
    for a in soup.find_all('a', class_='result__snippet'):
        print(a.text)
        print(a['href'])
        print("-" * 40)

duckduckgo_search("leakage current insulator support vector machine site:ieeexplore.ieee.org")
