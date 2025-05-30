from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Story Models
class Story(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    kid_name: str
    kid_age: int
    kid_photo: str = None  # Base64 encoded photo data
    theme: str
    story_type: str
    length: str
    special_ingredients: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    story_content: str = None  # Generated story content

class StoryCreate(BaseModel):
    kid_name: str
    kid_age: int
    kid_photo: str = None
    theme: str
    story_type: str
    length: str
    special_ingredients: List[str] = []

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Health check endpoint
@api_router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Storybook API is running"}

# Story endpoints
@api_router.post("/stories", response_model=dict)
async def create_story(story_data: StoryCreate):
    story_dict = story_data.dict()
    story_obj = Story(**story_dict)
    
    # Generate simple story content based on inputs
    story_content = generate_story_content(story_obj)
    story_obj.story_content = story_content
    
    # Insert into database
    result = await db.stories.insert_one(story_obj.dict())
    
    return {"id": story_obj.id, "message": "Story created successfully", "story_content": story_content}

@api_router.get("/stories/{story_id}")
async def get_story(story_id: str):
    story = await db.stories.find_one({"id": story_id})
    if not story:
        return {"error": "Story not found"}, 404
    return Story(**story)

@api_router.get("/stories")
async def get_all_stories():
    stories = await db.stories.find().to_list(1000)
    return [Story(**story) for story in stories]

def generate_story_content(story: Story) -> str:
    """Generate a simple story based on the story parameters"""
    theme_settings = {
        "forest": "deep in a magical forest filled with talking animals",
        "space": "on an exciting journey through the stars and planets",
        "ocean": "in the depths of the ocean with colorful sea creatures",
        "castle": "in a grand castle with brave knights and wise princesses",
        "dinosaur": "in prehistoric times with friendly dinosaurs",
        "fairy": "in an enchanted fairy kingdom with magical powers"
    }
    
    setting = theme_settings.get(story.theme, "in a magical world")
    ingredients_text = ", ".join(story.special_ingredients) if story.special_ingredients else "special surprises"
    
    length_pages = {
        "short": "a quick but exciting",
        "medium": "a wonderful",
        "long": "an epic and detailed"
    }
    
    story_length_desc = length_pages.get(story.length, "an amazing")
    
    story_content = f"""
    Once upon a time, there was a brave and curious child named {story.kid_name} who was {story.kid_age} years old.
    
    One magical day, {story.kid_name} found themselves {setting}. This was the beginning of {story_length_desc} adventure!
    
    Along the way, {story.kid_name} discovered {ingredients_text} that would help them on their journey.
    
    This {story.story_type} story was filled with wonder, excitement, and magical moments that {story.kid_name} would remember forever!
    
    The End.
    """
    
    return story_content.strip()

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
