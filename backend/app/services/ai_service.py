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
            
            # Now fetch rich TMDB data for each recommendation
            rich_recs = []
            for rec in ai_recs:
                try:
                    search_res = await tmdb_service.search(rec["search_query"], "multi")
                    results = search_res.get("results", [])
                    # Find the first matching result of the correct type
                    tmdb_type = "tv" if rec["type"] == "tv_show" else "movie"
                    match = next((r for r in results if r.get("media_type") == tmdb_type), None)
                    
                    if match:
                        details = await tmdb_service.get_details(match["id"], tmdb_type)
                        details["reason"] = rec["reason"]
                        rich_recs.append(details)
                    else:
                        # Fallback if TMDB search fails but we still have AI data
                        rich_recs.append({
                            "title": rec["title"],
                            "media_type": rec["type"],
                            "reason": rec["reason"]
                        })
                except Exception as ex:
                    print(f"Failed to fetch TMDB for {rec['title']}: {ex}")
                    
            return rich_recs
            
        except Exception as e:
            print(f"Error in advanced recommendations: {e}")
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
