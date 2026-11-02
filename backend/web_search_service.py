import os
from tavily import TavilyClient

TAVILY_API_KEY = "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"
tavily_client = TavilyClient(api_key=TAVILY_API_KEY)

def search_targeted_web(query: str, category: str = "general"):
    try:
        # Định nghĩa các trang web uy tín theo đúng ý em
        if category == "job":
            site_filter = "site:topcv.vn OR site:linkedin.com/jobs OR site:vietnamworks.com"
        elif category == "course":
            site_filter = "site:coursera.org OR site:udemy.com OR site:edx.org"
        elif category == "skill":
            site_filter = "site:roadmap.sh"
        else:
            site_filter = "site:topcv.vn OR site:coursera.org OR site:roadmap.sh"

        targeted_query = f"{query} ({site_filter})"
        
        response = tavily_client.search(
            query=targeted_query,
            search_depth="basic",
            max_results=3
        )
        
        search_results = response.get("results", [])
        context_data = ""
        sources = []
        
        for item in search_results:
            title = item.get('title', 'Không có tiêu đề')
            content = item.get('content', '')
            url = item.get('url', '#')
            
            context_data += f"Tiêu đề: {title}\nNội dung: {content}\nLink: {url}\n\n"
            sources.append(url)
            
        return context_data, sources
    except Exception as e:
        print("Lỗi gọi Tavily API:", e)
        return "", []