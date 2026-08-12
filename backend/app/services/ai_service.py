from google import genai
from app.config import settings
import json

class AIService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
            self.model_id = 'gemini-3.5-flash'
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
            raise ValueError("Failed to generate review. Check API limits or configuration.")

ai_service = AIService()
