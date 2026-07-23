import requests
import json

def get_papers(query):
    url = f"https://api.openalex.org/works?search={query}&filter=publication_year:>2020&per-page=3"
    r = requests.get(url)
    if r.status_code == 200:
        return r.json().get('results', [])
    return []

papers1 = get_papers("time series forecasting battery health")
papers2 = get_papers("support vector machine leakage current insulator")

results = {
    "same_algo_diff_method": [
        {"title": p.get("title"), "doi": p.get("doi"), "year": p.get("publication_year"), "authors": [a["author"]["display_name"] for a in p.get("authorships", [])]} for p in papers1
    ],
    "diff_algo_same_method": [
        {"title": p.get("title"), "doi": p.get("doi"), "year": p.get("publication_year"), "authors": [a["author"]["display_name"] for a in p.get("authorships", [])]} for p in papers2
    ]
}

with open("papers_result.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=4, ensure_ascii=False)
