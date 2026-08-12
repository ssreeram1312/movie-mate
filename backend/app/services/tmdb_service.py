import httpx
from fastapi import HTTPException
from app.config import settings

class TMDBService:
    def __init__(self):
        self.api_key = settings.TMDB_API_KEY
        self.base_url = settings.TMDB_BASE_URL
        self.image_base_url = settings.TMDB_IMAGE_BASE_URL
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "accept": "application/json"
        }

    async def search(self, query: str, media_type: str = "multi"):
        """Search TMDB for movies or TV shows."""
        if not self.api_key:
            raise HTTPException(status_code=500, detail="TMDB API key not configured")
            
        endpoint = f"{self.base_url}/search/{media_type}"
        params = {
            "query": query,
            "language": "en-US",
            "page": 1,
            "include_adult": "false"
        }
        
        async with httpx.AsyncClient() as client:
            # We use the Authorization header (Bearer token) if the key looks like a v4 token,
            # otherwise we fallback to api_key param for v3 keys.
            if len(self.api_key) < 50:
                params["api_key"] = self.api_key
                headers = {"accept": "application/json"}
            else:
                headers = self.headers

            response = await client.get(endpoint, params=params, headers=headers)
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="TMDB search failed")
                
            return response.json()

    async def get_details(self, tmdb_id: int, media_type: str = "movie"):
        """Get full details for a specific TMDB item."""
        if not self.api_key:
            raise HTTPException(status_code=500, detail="TMDB API key not configured")
            
        endpoint = f"{self.base_url}/{media_type}/{tmdb_id}"
        params = {"language": "en-US", "append_to_response": "credits,watch/providers"}
        
        async with httpx.AsyncClient() as client:
            if len(self.api_key) < 50:
                params["api_key"] = self.api_key
                headers = {"accept": "application/json"}
            else:
                headers = self.headers

            response = await client.get(endpoint, params=params, headers=headers)
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="TMDB details failed")
                
            data = response.json()
            
            # Format the data to match our schema
            formatted_data = {
                "tmdb_id": data.get("id"),
                "title": data.get("title") or data.get("name"),
                "overview": data.get("overview"),
                "poster_url": f"{self.image_base_url}/w500{data['poster_path']}" if data.get("poster_path") else None,
                "backdrop_url": f"{self.image_base_url}/w1280{data['backdrop_path']}" if data.get("backdrop_path") else None,
            }

            # Type-specific formatting
            if media_type == "tv":
                formatted_data["release_year"] = int(data["first_air_date"][:4]) if data.get("first_air_date") else None
                formatted_data["total_episodes"] = data.get("number_of_episodes")
                # Get average runtime
                runtimes = data.get("episode_run_time", [])
                if runtimes:
                    formatted_data["runtime_minutes"] = runtimes[0]
                elif data.get("last_episode_to_air") and data["last_episode_to_air"].get("runtime"):
                    formatted_data["runtime_minutes"] = data["last_episode_to_air"]["runtime"]
                else:
                    formatted_data["runtime_minutes"] = None
                    
                # TV shows use created_by for creators instead of directors
                creators = data.get("created_by", [])
                formatted_data["director"] = creators[0].get("name") if creators else None
            else:
                formatted_data["release_year"] = int(data["release_date"][:4]) if data.get("release_date") else None
                formatted_data["runtime_minutes"] = data.get("runtime")
                
                # Get director from credits
                credits_data = data.get("credits") or {}
                crew = credits_data.get("crew") or []
                director = next((member["name"] for member in crew if member.get("job") == "Director"), None)
                formatted_data["director"] = director
                
            # Get genres (comma separated)
            genres = data.get("genres", [])
            formatted_data["genre"] = ", ".join([g["name"] for g in genres]) if genres else None

            # Get Platform (streaming in US)
            providers_data = data.get("watch/providers") or {}
            results_data = providers_data.get("results") or {}
            us_providers = results_data.get("US") or {}
            flatrate = us_providers.get("flatrate") or []
            if flatrate:
                provider_name = flatrate[0].get("provider_name")
                formatted_data["platform"] = provider_name
            else:
                formatted_data["platform"] = None
            
            return formatted_data

tmdb_service = TMDBService()
