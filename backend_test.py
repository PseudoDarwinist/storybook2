import requests
import unittest
import os
import json

class StoryBookAPITest(unittest.TestCase):
    def __init__(self, *args, **kwargs):
        super(StoryBookAPITest, self).__init__(*args, **kwargs)
        # Get the backend URL from the frontend .env file
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    self.base_url = line.strip().split('=')[1].strip('"\'')
                    break
        
        print(f"Using backend URL: {self.base_url}")
        
    def test_api_health(self):
        """Test if the API is up and running"""
        try:
            response = requests.get(f"{self.base_url}/api/health")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["status"], "ok")
            print("✅ API health check passed")
        except Exception as e:
            print(f"❌ API health check failed: {str(e)}")
            raise

    def test_api_endpoints(self):
        """Test all API endpoints defined in the backend"""
        try:
            # Test story creation endpoint
            story_data = {
                "kid_name": "Test Kid",
                "kid_age": 5,
                "kid_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
                "theme": "forest",
                "story_type": "adventure",
                "length": "short",
                "special_ingredients": ["Magic spells", "Talking animals"]
            }
            
            response = requests.post(f"{self.base_url}/api/stories", json=story_data)
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("id", data)
            story_id = data["id"]
            print(f"✅ Story creation API test passed, created story with ID: {story_id}")
            
            # Test getting a story by ID
            response = requests.get(f"{self.base_url}/api/stories/{story_id}")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["kid_name"], "Test Kid")
            print("✅ Get story by ID API test passed")
            
        except Exception as e:
            print(f"❌ API endpoints test failed: {str(e)}")
            raise

if __name__ == "__main__":
    unittest.main()