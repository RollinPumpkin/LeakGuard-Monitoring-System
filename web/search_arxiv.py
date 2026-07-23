import urllib.request
import xml.etree.ElementTree as ET

def search_arxiv(query):
    url = f"http://export.arxiv.org/api/query?search_query=all:{query}&start=0&max_results=3&sortBy=submittedDate&sortOrder=desc"
    # url encode query
    url = url.replace(" ", "+")
    try:
        response = urllib.request.urlopen(url)
        data = response.read()
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
    except Exception as e:
        print("Error:", e)

print("=== PAPER 1: Same Algo, Diff Method ===")
search_arxiv("time series forecasting battery")

print("\n=== PAPER 2: Diff Algo, Same Method ===")
search_arxiv("leakage current insulator")
