# TierForge: Resilient Bulk Store Scoring & Tiering
TierForge, a service that ingests a large list of stores, enriches each one with a few business metrics via a slow, rate-limited, and occasionally unreliable API, then scores and tiers every store (Large / Medium / Small) based on user-configurable weights.

# Clone Respository
The repository contains the code for both backend as well as Frontend in teh respective folders. 
The steps to run both services are also contained in README.md files for each.
```bash
git clone https://github.com/prithvisshenoy/TierForge.git
```

# Repository Structure

```text
TierForge/
├── Backend/
│   └── app/                         # FastAPI backend
│       ├── models/                  # Request and domain models
│       ├── utils/                   # Database helpers
│       ├── main.py                  # API routes and app setup
│       ├── service.py               # CSV ingestion, job status, and tier calculations
│       ├── worker.py                # Store enrichment processing
│       ├── tasks.py                 # Background task wrapper
│       ├── sql_commands.sql         # PostgreSQL schema
│       └── requirements.txt         # Python dependencies
├── Frontend/
│   └── tierforge-ui/                # React web application
│       ├── api/                     # Backend API client and endpoint helpers
│       ├── public/                  # Static public assets
│       ├── src/
│       │   ├── assets/              # Imported images and assets
│       │   └── components/          # Upload, job, and tiering UI components
│       ├── package.json             # Frontend dependencies and scripts
│       └── vite.config.js           # Vite configuration
└── README.md                        # Project overview and documentation
```

# Tech Stack

- **Backend:** Python, FastAPI, Pydantic, SQLAlchemy, Pandas
- **Database:** PostgreSQL with Psycopg
- **Background processing:** FastAPI background tasks; Celery and Redis packages are also included as task-queue dependencies
- **Frontend:** React 19, Vite, Material UI
- **Frontend utilities:** Axios for API requests, PapaParse for CSV parsing

# Architecture
TierForge uses a client-server design. The React frontend handles CSV selection and validation, submits uploads to the FastAPI backend, polls for job progress, and sends scoring thresholds and weights when the user requests tier results.

The backend separates request handling from processing and persistence:

1. **Ingestion:** `POST /upload` validates the CSV, creates a job record, stores its input rows in `stores`, and ensures each store has an `enrichments` record.
2. **Enrichment:** The backend schedules the batch processor with FastAPI `BackgroundTasks`. The processor calls the external enrichment API asynchronously in batches, limits concurrent requests, retries request failures, and writes returned metrics and per-store status to PostgreSQL.
3. **Progress:** `GET /job/{job_id}` reads the job and enrichment records to report successful, failed, and pending counts for the frontend.
4. **Scoring and tiering:** `POST /tiers` calculates scores for successfully enriched stores using the supplied thresholds and weights, returns the tier breakdown and store results, and schedules those results to be upserted into `store_tier_results`.

PostgreSQL keeps batch-specific input and status in `jobs` and `stores`. `enrichments` stores metrics and processing status once per unique `store_id`, allowing completed enrichment data to be reused across uploads. `store_tier_results` records the score, tier, and metric snapshots for each job/store pair.

Background enrichment currently runs through FastAPI's in-process `BackgroundTasks`; although Celery-related code and dependencies are present, the upload endpoint does not currently dispatch work to a Celery queue.



# NOTE
- Please ensure the Encrich API is working by running the enrichment_simulator using teh steps given in that folder. It must run on port 8000 as mentioned since that is the URL being used to call enrich api as a third party API in this backend code.
- This backend service is being run on port 8002 as mentioned in the README.md file of Backend. Ensure thsi is also working on the same port since the Frontend service has integrated the APIs on this port.

