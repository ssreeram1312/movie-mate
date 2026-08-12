from google import genai
from app.config import settings
import json
import asyncio
from app.services.tmdb_service import tmdb_service

class AIService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
            self.model_id = 'gemini-3.1-flash-lite'
        else:
            self.client = None

    async def generate_recommendations(self, media_list):
        if not self.client:
            raise ValueError("Gemini API key not configured. Add GEMINI_API_KEY to backend/.env")
        
        if not media_list:
            return []
            
        # Format the media list to just the essentials
        formatted_list = ", ".join([f"{m.title} ({m.genre or 'Unknown'}, {m.rating or 'Unrated'}/10)" for m in media_list])
        
        prompt = f"""
        Based on the following list of movies and TV shows the user has in their collection (along with genres and ratings), 
        suggest 4 new movies or TV shows they might like.
        
        User's list:
        {formatted_list}
        
        Return ONLY a raw JSON array of objects. Do not include markdown formatting or backticks.
        Each object MUST have exactly these keys:
        - "title": The name of the movie or show
        - "type": "movie" or "tv_show"
        - "reason": A short 1-sentence reason why you recommend it based on their list.
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt,
            )
            text = response.text.strip()
            
            # Clean up possible markdown from Gemini
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            return json.loads(text.strip())
        except Exception as e:
            print(f"Error in recommendations: {e}")
            if "429" in str(e):
                raise ValueError("You have reached the Gemini API daily rate limit. Please try again later.")
            raise ValueError("Failed to parse AI response or hit API limit")

    async def generate_advanced_recommendations(self, mode, data, media_list):
        if not self.client:
            raise ValueError("Gemini API key not configured. Add GEMINI_API_KEY to backend/.env")
            
        formatted_list = ", ".join([f"{m.title} ({m.genre or 'Unknown'})" for m in media_list]) if media_list else "Empty Collection"
        
        if mode == "collection":
            if not media_list:
                return []
            context = f"The user has the following movies and TV shows in their collection: {formatted_list}. Suggest 4 NEW titles they might like."
        elif mode == "quiz":
            context = f"The user took a quiz for recommendations. Their answers: {json.dumps(data)}. Suggest 4 titles matching this vibe."
            if media_list:
                context += f"\nAvoid suggesting things they already have: {formatted_list}"
        elif mode == "custom":
            context = f"The user asked specifically for: '{data}'. Suggest 4 titles matching this request."
            if media_list:
                context += f"\nAvoid suggesting things they already have: {formatted_list}"
        else:
            raise ValueError("Invalid mode")

        prompt = f"""
        {context}
        
        Return ONLY a raw JSON array of 4 objects. Do not include markdown formatting or backticks.
        Each object MUST have exactly these keys:
        - "title": The exact name of the movie or show.
        - "type": "movie" or "tv_show".
        - "search_query": The best query string to search TMDB for this specific title.
        - "reason": A short 1-sentence personalized reason why you recommend it.
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt,
            )
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            ai_recs = json.loads(text.strip())
            
            # Fetch rich TMDB data sequentially using a fresh HTTP client for this batch
            import httpx
            from app.config import settings
            
            rich_recs = []
            async with httpx.AsyncClient(timeout=15.0) as client:
                api_key = settings.TMDB_API_KEY
                base_url = settings.TMDB_BASE_URL
                image_base_url = settings.TMDB_IMAGE_BASE_URL
                
                if len(api_key) < 50:
                    headers = {"accept": "application/json"}
                    auth_params = {"api_key": api_key}
                else:
                    headers = {"Authorization": f"Bearer {api_key}", "accept": "application/json"}
                    auth_params = {}
                
                for rec in ai_recs:
                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            # Search TMDB
                            search_params = {"query": rec["search_query"], "language": "en-US", "page": 1, "include_adult": "false", **auth_params}
                            search_resp = await client.get(f"{base_url}/search/multi", params=search_params, headers=headers)
                            results = search_resp.json().get("results", []) if search_resp.status_code == 200 else []
                            
                            tmdb_type = "tv" if rec["type"] == "tv_show" else "movie"
                            match = next((r for r in results if r.get("media_type") == tmdb_type), None)
                            
                            if match:
                                # Fetch details
                                detail_params = {"language": "en-US", "append_to_response": "credits,watch/providers", **auth_params}
                                detail_resp = await client.get(f"{base_url}/{tmdb_type}/{match['id']}", params=detail_params, headers=headers)
                                
                                if detail_resp.status_code == 200:
                                    data = detail_resp.json()
                                    
                                    # Format response
                                    enriched = {
                                        "tmdb_id": data.get("id"),
                                        "title": data.get("title") or data.get("name"),
                                        "overview": data.get("overview"),
                                        "poster_url": f"{image_base_url}/w500{data['poster_path']}" if data.get("poster_path") else None,
                                        "backdrop_url": f"{image_base_url}/w1280{data['backdrop_path']}" if data.get("backdrop_path") else None,
                                        "reason": rec["reason"],
                                        "media_type": tmdb_type,
                                    }
                                    
                                    # Year & runtime
                                    if tmdb_type == "tv":
                                        enriched["release_year"] = int(data["first_air_date"][:4]) if data.get("first_air_date") else None
                                        enriched["total_episodes"] = data.get("number_of_episodes")
                                        runtimes = data.get("episode_run_time", [])
                                        enriched["runtime_minutes"] = runtimes[0] if runtimes else (data.get("last_episode_to_air", {}) or {}).get("runtime")
                                        creators = data.get("created_by", [])
                                        enriched["director"] = creators[0].get("name") if creators else None
                                    else:
                                        enriched["release_year"] = int(data["release_date"][:4]) if data.get("release_date") else None
                                        enriched["runtime_minutes"] = data.get("runtime")
                                        crew = (data.get("credits") or {}).get("crew") or []
                                        enriched["director"] = next((m["name"] for m in crew if m.get("job") == "Director"), None)
                                    
                                    # Genres
                                    genres = data.get("genres", [])
                                    enriched["genre"] = ", ".join([g["name"] for g in genres]) if genres else None
                                    
                                    # Platform
                                    providers = ((data.get("watch/providers") or {}).get("results") or {}).get("US") or {}
                                    flatrate = providers.get("flatrate") or []
                                    enriched["platform"] = flatrate[0].get("provider_name") if flatrate else None
                                    
                                    rich_recs.append(enriched)
                                else:
                                    rich_recs.append({"title": rec["title"], "media_type": rec["type"], "reason": rec["reason"]})
                            else:
                                rich_recs.append({"title": rec["title"], "media_type": rec["type"], "reason": rec["reason"]})
                            break  # Success
                        except Exception as ex:
                            if attempt < max_retries - 1:
                                print(f"TMDB fetch failed for {rec.get('title', 'Unknown')} (Attempt {attempt+1}): {repr(ex)}. Retrying...")
                                await asyncio.sleep(1.5)
                            else:
                                print(f"Failed to fetch TMDB for {rec.get('title', 'Unknown')} after {max_retries} attempts: {repr(ex)}")
                                rich_recs.append({"title": rec.get("title", "Unknown"), "media_type": rec.get("type", "movie"), "reason": rec.get("reason", "")})
                    
                    # Small delay between titles
                    await asyncio.sleep(0.3)
            
            return rich_recs
            
        except Exception as e:
            print(f"Error in advanced recommendations: {e}")
            if "429" in str(e):
                raise ValueError("You have reached the Gemini API daily rate limit. Please try again later.")
            raise ValueError("Failed to parse AI response or hit API limit")

    async def generate_watch_party_recommendations(self, duration_minutes, type_preference, mood, pacing, media_list):
        if not self.client:
            raise ValueError("Gemini API key not configured")
            
        formatted_list = ", ".join([f"{m.title} ({m.genre or 'Unknown'})" for m in media_list]) if media_list else "Empty Collection"
        
        prompt = f"""
        The users are planning a watch party. They have EXACTLY {duration_minutes} minutes of overlapping free time.
        They want to watch: '{type_preference}'.
        Their preferred mood is: '{mood}'.
        Their preferred pacing is: '{pacing}'.
        
        Suggest 4 highly-rated titles that PERFECTLY match this mood, pacing, and type preference, AND whose runtime (or single episode runtime if it's a TV show) strictly fits well UNDER {duration_minutes} minutes.
        Avoid suggesting things they already have: {formatted_list}
        
        Return ONLY a raw JSON array of 4 objects. Do not include markdown formatting or backticks.
        Each object MUST have exactly these keys:
        - "title": The exact name of the movie/show.
        - "type": "movie" or "tv_show".
        - "search_query": The best query string to search TMDB for this specific title.
        - "reason": A short 1-sentence explanation of why it fits the mood and their time limit.
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt,
            )
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            ai_recs = json.loads(text.strip())
            
            # Fetch rich TMDB data sequentially using a fresh HTTP client for this batch
            import httpx
            from app.config import settings
            
            rich_recs = []
            async with httpx.AsyncClient(timeout=15.0) as client:
                api_key = settings.TMDB_API_KEY
                base_url = settings.TMDB_BASE_URL
                image_base_url = settings.TMDB_IMAGE_BASE_URL
                
                if len(api_key) < 50:
                    headers = {"accept": "application/json"}
                    auth_params = {"api_key": api_key}
                else:
                    headers = {"Authorization": f"Bearer {api_key}", "accept": "application/json"}
                    auth_params = {}
                
                for rec in ai_recs:
                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            search_params = {"query": rec["search_query"], "language": "en-US", "page": 1, "include_adult": "false", **auth_params}
                            search_resp = await client.get(f"{base_url}/search/multi", params=search_params, headers=headers)
                            results = search_resp.json().get("results", []) if search_resp.status_code == 200 else []
                            
                            tmdb_type = "tv" if rec["type"] == "tv_show" else "movie"
                            match = next((r for r in results if r.get("media_type") == tmdb_type), None)
                            
                            if match:
                                detail_params = {"language": "en-US", "append_to_response": "credits,watch/providers", **auth_params}
                                detail_resp = await client.get(f"{base_url}/{tmdb_type}/{match['id']}", params=detail_params, headers=headers)
                                
                                if detail_resp.status_code == 200:
                                    data = detail_resp.json()
                                    enriched = {
                                        "tmdb_id": data.get("id"),
                                        "title": data.get("title") or data.get("name"),
                                        "overview": data.get("overview"),
                                        "poster_url": f"{image_base_url}/w500{data['poster_path']}" if data.get("poster_path") else None,
                                        "backdrop_url": f"{image_base_url}/w1280{data['backdrop_path']}" if data.get("backdrop_path") else None,
                                        "reason": rec["reason"],
                                        "media_type": tmdb_type,
                                    }
                                    
                                    if tmdb_type == "tv":
                                        enriched["release_year"] = int(data["first_air_date"][:4]) if data.get("first_air_date") else None
                                        enriched["total_episodes"] = data.get("number_of_episodes")
                                        runtimes = data.get("episode_run_time", [])
                                        enriched["runtime_minutes"] = runtimes[0] if runtimes else (data.get("last_episode_to_air", {}) or {}).get("runtime")
                                        creators = data.get("created_by", [])
                                        enriched["director"] = creators[0].get("name") if creators else None
                                    else:
                                        enriched["release_year"] = int(data["release_date"][:4]) if data.get("release_date") else None
                                        enriched["runtime_minutes"] = data.get("runtime")
                                        crew = (data.get("credits") or {}).get("crew") or []
                                        enriched["director"] = next((m["name"] for m in crew if m.get("job") == "Director"), None)
                                    
                                    genres = data.get("genres", [])
                                    enriched["genre"] = ", ".join([g["name"] for g in genres]) if genres else None
                                    
                                    providers = ((data.get("watch/providers") or {}).get("results") or {}).get("US") or {}
                                    flatrate = providers.get("flatrate") or []
                                    enriched["platform"] = flatrate[0].get("provider_name") if flatrate else None
                                    
                                    rich_recs.append(enriched)
                                else:
                                    rich_recs.append({"title": rec["title"], "media_type": rec["type"], "reason": rec["reason"]})
                            else:
                                rich_recs.append({"title": rec["title"], "media_type": rec["type"], "reason": rec["reason"]})
                            break
                        except Exception as ex:
                            if attempt < max_retries - 1:
                                print(f"TMDB fetch failed for WP {rec.get('title', 'Unknown')} (Attempt {attempt+1}): {repr(ex)}. Retrying...")
                                await asyncio.sleep(1.5)
                            else:
                                print(f"Failed to fetch TMDB for WP {rec.get('title', 'Unknown')} after {max_retries} attempts")
                                rich_recs.append({"title": rec.get("title", "Unknown"), "media_type": rec.get("type", "movie"), "reason": rec.get("reason", "")})
                    
                    await asyncio.sleep(0.3)
            
            return rich_recs
            
        except Exception as e:
            print(f"Error in watch party recommendations: {e}")
            if "429" in str(e):
                raise ValueError("You have reached the Gemini API daily rate limit. Please try again later.")
            raise ValueError("Failed to parse AI response or hit API limit")

    async def generate_review(self, title, genre, rating, notes):
        if not self.client:
            raise ValueError("Gemini API key not configured")
            
        prompt = f"""
        Write a short, engaging review (around 2-3 sentences) for the movie/show '{title}'.
        Genre: {genre or 'Unknown'}
        User's Rating: {rating or 'Unrated'} / 10
        User's Personal Notes: {notes or 'No notes provided.'}
        
        Write it from a first-person perspective (e.g. "I thought...", "It was..."), incorporating the rating and notes naturally.
        Do NOT wrap the output in quotes. Do NOT add any markdown formatting. Just return the text.
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=prompt,
            )
            return response.text.strip()
        except Exception as e:
            print(f"Error generating review: {e}")
            if "429" in str(e):
                raise ValueError("You have reached the Gemini API daily rate limit. Please try again later.")
            raise ValueError("Failed to generate review. Check API limits or configuration.")

ai_service = AIService()
