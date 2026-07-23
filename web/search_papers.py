import requests
import json

def search_paper(query, year_filter=">2020"):
    url = f"https://api.openalex.org/works?search={query}&filter=publication_year:{year_filter}&per-page=3"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        for work in data.get("results", []):
            print(f"Title: {work.get('title')}")
            print(f"DOI: {work.get('doi')}")
            print(f"Year: {work.get('publication_year')}")
            authors = [a["author"]["display_name"] for a in work.get("authorships", [])]
            print(f"Authors: {', '.join(authors)}")
            print("-" * 40)
    else:
        print("Error fetching", url)

print("=== PAPER 1: Same Algorithm, Different Method ===")
search_paper("time series forecasting battery health")

print("\n=== PAPER 2: Different Algorithm, Same Method ===")
search_paper("support vector machine leakage current insulator")
