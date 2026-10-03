# TierForge Backend API System
The backend API system for data ingestion, job setting, scoring layer and tier calculations.
This app contains the main logic behind fetching the data and calling the 3rd party enrichment API. It also calculates the scoring metrics and segregates the data into tiers - Large, Medium, Small.

## Repository Structure

```text
Backend/
└── app/                         # FastAPI backend application
  ├── models/                  # Request and domain models
  │   └── models.py            # Tier-calculation request schema and job statuses
  ├── utils/                   # Shared backend utilities
  │   ├── db_utils.py          # Database connection and query helpers
  │   └── init.py              # Utility package initialization
  ├── main.py                  # FastAPI app and HTTP endpoints
  ├── service.py               # CSV ingestion, job status, and tier calculations
  ├── worker.py                # Batch enrichment and per-store processing
  ├── tasks.py                 # Background task wrapper for enrichment jobs (If celery was used, so placeholder for now)
  ├── sql_commands.sql         # Database schema and indexes (PostgreSQL)
  ├── requirements.txt         # Python dependencies
  ├── .env                     # Local database and service configuration (not commiitted to git)
  └── README.md                # Backend setup and API documentation
```

## Run it
Ensure you are inside the 'app' folder before you run the following.
```bash
cd Backend/app
```

Create a virtual environment
```bash
python -m venv .venv
```

Activate the environment
```bash
.\.venv\Scripts\activate  
```

Install the dependencies
```bash
pip install -r requirements.txt
```

Run the FASTAPI app
```bash
uvicorn main:app --port 8002
```


## Endpoints

### `POST /upload`
This endpoint takes the csv file as user input.It triggers a job to ingest and process the data, calling the enrich API(third party).

Request:
```
**Content-Type:** `multipart/form-data`
**Input**: UploadFile
```

Success response (`200`):
```json
{
  "job_id": 5,
  "status": "PENDING",
  "total_records": 15,
  "message": "File accepted. Batch enrichment job initiated successfully."
}
```

### `GET /job/{job_id}`
This endpoint can be used to check the status update of the triggered job. Thisis also used to show the progress on the UI.

Request:
```
**Query Parameters:** `job_id`
```

Success response (`200`):
```json
{
  "job_id": 1,
  "status": "COMPLETED", //Shows status as pending., processing, completed or failed
  "progress": {
    "total_records": 15,
    "successful_records": 15,
    "failed_records": 0,
    "failed_records_details": [],
    "pending_records": 0,
    "percentage": 100
  }
}
```

### `POST /tiers`
This endpoint is the scoring layer which calculates the score and splits the data into tiers - Large, Medium and Small basis the user input thresholds and weights.

Request:
```
**Content-Type:** `application/json`
```

```json
{
  "job_id": 1,
  "footfall_bar": 15000,
  "footfall_weight": 50,
  "revenue_bar": 150000,
  "revenue_weight": 30,
  "size_bar": 8000,
  "size_weight": 20,
  "large_tier_threshold": 70,
  "medium_tier_threshold": 30
}
```

Success response (`200`):
```json
{
  "job_id": 1,
  "tier_breakdown": {
    "large": 9,
    "medium": 3,
    "small": 3,
    "total_enriched": 15
  },
  "stores": [
    {
      "store_id": "ST000001",
      "store_name": "Fresh Supermarket #1",
      "metrics": {
        "footfall": 37070,
        "revenue": 45522.32,
        "size_sqft": 8765
      },
      "score_percentage": 70,
      "tier": "Large"
    },
    {
      "store_id": "ST000002",
      "store_name": "City Pharmacy #2",
      "metrics": {
        "footfall": 4262,
        "revenue": 106055.91,
        "size_sqft": 4356
      },
      "score_percentage": 0,
      "tier": "Small"
    },
    {
      "store_id": "ST000003",
      "store_name": "Neighborhood Supermarket #3",
      "metrics": {
        "footfall": 9254,
        "revenue": 114227.66,
        "size_sqft": 3738
      },
      "score_percentage": 0,
      "tier": "Small"
    },
    {
      "store_id": "ST000004",
      "store_name": "Metro Supermarket #4",
      "metrics": {
        "footfall": 49343,
        "revenue": 465902.31,
        "size_sqft": 782
      },
      "score_percentage": 80,
      "tier": "Large"
    },
    {
      "store_id": "ST000005",
      "store_name": "Family Supermarket #5",
      "metrics": {
        "footfall": 37957,
        "revenue": 23099.74,
        "size_sqft": 17684
      },
      "score_percentage": 70,
      "tier": "Large"
    },
    {
      "store_id": "ST000006",
      "store_name": "Metro Grocery Store #6",
      "metrics": {
        "footfall": 33351,
        "revenue": 404694.03,
        "size_sqft": 14022
      },
      "score_percentage": 100,
      "tier": "Large"
    },
    {
      "store_id": "ST000007",
      "store_name": "Green Supermarket #7",
      "metrics": {
        "footfall": 44917,
        "revenue": 250304.86,
        "size_sqft": 8472
      },
      "score_percentage": 100,
      "tier": "Large"
    },
    {
      "store_id": "ST000008",
      "store_name": "Prime Hypermarket #8",
      "metrics": {
        "footfall": 24855,
        "revenue": 459018.29,
        "size_sqft": 2833
      },
      "score_percentage": 80,
      "tier": "Large"
    },
    {
      "store_id": "ST000009",
      "store_name": "Daily Supermarket #9",
      "metrics": {
        "footfall": 3607,
        "revenue": 360670.47,
        "size_sqft": 19799
      },
      "score_percentage": 50,
      "tier": "Medium"
    },
    {
      "store_id": "ST000010",
      "store_name": "Neighborhood Hypermarket #10",
      "metrics": {
        "footfall": 646,
        "revenue": 263874.79,
        "size_sqft": 7218
      },
      "score_percentage": 30,
      "tier": "Medium"
    },
    {
      "store_id": "ST000011",
      "store_name": "Daily Convenience Store #11",
      "metrics": {
        "footfall": 20167,
        "revenue": 168427.19,
        "size_sqft": 14822
      },
      "score_percentage": 100,
      "tier": "Large"
    },
    {
      "store_id": "ST000012",
      "store_name": "Royal Hypermarket #12",
      "metrics": {
        "footfall": 7562,
        "revenue": 380164.52,
        "size_sqft": 16695
      },
      "score_percentage": 50,
      "tier": "Medium"
    },
    {
      "store_id": "ST000013",
      "store_name": "Metro Convenience Store #13",
      "metrics": {
        "footfall": 13206,
        "revenue": 29066.08,
        "size_sqft": 4493
      },
      "score_percentage": 0,
      "tier": "Small"
    },
    {
      "store_id": "ST000014",
      "store_name": "Green Pharmacy #14",
      "metrics": {
        "footfall": 27894,
        "revenue": 149196.52,
        "size_sqft": 15401
      },
      "score_percentage": 70,
      "tier": "Large"
    },
    {
      "store_id": "ST000015",
      "store_name": "Corner Supermarket #15",
      "metrics": {
        "footfall": 19824,
        "revenue": 462469.17,
        "size_sqft": 15836
      },
      "score_percentage": 100,
      "tier": "Large"
    }
  ]
}
```

## Limitations