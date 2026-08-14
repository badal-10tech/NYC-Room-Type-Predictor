from fastapi import FastAPI
from pydantic import BaseModel, Field
import pandas as pd
import joblib
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = BASE_DIR / "notebook" / "model_pipeline.pkl"
model = joblib.load(MODEL_PATH)
app = FastAPI(title="NYC Room Type Predictor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)
COLUMNS = [
    "latitude",
    "longitude",
    "price",
    "minimum_nights",
    "number_of_reviews",
    "reviews_per_month",
    "calculated_host_listings_count",
    "availability_365",
    "neighbourhood_group",
    "neighbourhood"
]

class Features(BaseModel):
    latitude: float = Field(
        ...,
        ge=-90,
        le=90,
        description="Latitude must be between -90 and 90"
    )

    longitude: float = Field(
        ...,
        ge=-180,
        le=180,
        description="Longitude must be between -180 and 180"
    )

    price: float = Field(
        ...,
        ge=0,
        description="Price per night, must be non-negative"
    )

    minimum_nights: int = Field(
        ...,
        ge=1,
        description="Minimum night required for booking"
    )

    number_of_reviews: int = Field(
        ...,
        ge=0,
        description="Total number of reviews"
    )

    reviews_per_month: float = Field(
        ...,
        ge=0,
        description="Average reviews per month"
    )

    calculated_host_listings_count: int = Field(
        ...,
        ge=0,
        description="Number of listings by the host"
    )

    availability_365: int = Field(
        ...,
        ge=0,
        le=365,
        description="Days available out of 365"
    )

    neighbourhood_group: str = Field(
        ...,
        min_length=1,
        description="Borough or neighbourhood group"
    )

    neighbourhood: str = Field(
        ...,
        min_length=1,
        description="Specify neighbourhood name"
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def prediction(features: Features):

    row = pd.DataFrame([features.model_dump()])
    row = row[COLUMNS]

    # Prediction
    prediction = model.predict(row)[0]

    # Probabilities
    probability = model.predict_proba(row)[0]

    # Get class names from the trained model
    classes = model.classes_

    return {
        "prediction": str(prediction),
        "probabilities": [
            {
                "room_type": str(room_type),
                "probability": float(prob)
            }
            for room_type, prob in zip(classes, probability)
        ]
    }
# Serve the UI from FastAPI.
app.mount("/static", StaticFiles(directory=BASE_DIR / "frontend"), name="static")
@app.get("/")
def frontend():
    return FileResponse(BASE_DIR / "frontend" / "index.html")