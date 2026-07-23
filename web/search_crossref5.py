import urllib.request
import urllib.parse
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def search(q):
    url = f"https://api.crossref.org/works?query={urllib.parse.quote(q)}&select=title,author,issued,DOI&rows=10"
    req = urllib.request.Request(url, headers={'User-Agent': 'mailto:test@example.com'})
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        data = json.loads(resp.read())
        for item in data.get('message', {}).get('items', []):
            title = item.get('title', [''])[0]
            doi = item.get('DOI', '')
            authors = []
            for a in item.get('author', []):
                authors.append(f"{a.get('given', '')} {a.get('family', '')}".strip())
            
            issued_obj = item.get('issued', {})
            date_parts = issued_obj.get('date-parts', [[0]])
            if date_parts and date_parts[0] and date_parts[0][0]:
                issued = date_parts[0][0]
                if isinstance(issued, int) and issued >= 2020 and 'insulator' in title.lower() and 'leakage' in title.lower():
                    print(f"Title: {title}")
                    print(f"Authors: {', '.join(authors)}")
                    print(f"Year: {issued}")
                    print(f"DOI: https://doi.org/{doi}")
                    print("-" * 40)
                    break
    except Exception as e:
        print("Error:", e)

search("insulator leakage prediction support vector machine")
