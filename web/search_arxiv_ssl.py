import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

def search(q):
    url = f"http://export.arxiv.org/api/query?search_query=all:{urllib.parse.quote(q)}&start=0&max_results=1&sortBy=submittedDate&sortOrder=desc"
    resp = urllib.request.urlopen(url, context=ctx)
    data = resp.read()
    root = ET.fromstring(data)
    for entry in root.findall("{http://www.w3.org/2005/Atom}entry"):
        title = entry.find("{http://www.w3.org/2005/Atom}title").text.strip().replace("\n", " ")
        published = entry.find("{http://www.w3.org/2005/Atom}published").text[:4]
        authors = [author.find("{http://www.w3.org/2005/Atom}name").text for author in entry.findall("{http://www.w3.org/2005/Atom}author")]
        doi_element = entry.find("{http://arxiv.org/schemas/atom}doi")
        id_url = entry.find("{http://www.w3.org/2005/Atom}id").text
        doi = doi_element.text if doi_element is not None else id_url
        print(f"Title: {title}")
        print(f"Authors: {', '.join(authors)}")
        print(f"Year: {published}")
        print(f"DOI/URL: {doi}")
        print("-" * 40)

search("time series forecasting battery")
search("leakage current insulator")
