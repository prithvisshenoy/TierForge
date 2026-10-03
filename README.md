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

# Limitations & Future Improvements

### Current Background Job Processing

The current backend implementation uses FastAPI's `BackgroundTasks` to trigger the store-enrichment job. Once a CSV is uploaded, the backend processes the stores in the background and calls the enrichment API to retrieve the required metrics.

While this approach is sufficient for the current implementation, it has an important reliability limitation: the background job is tightly coupled to the lifecycle of the FastAPI application process.

### Known Limitation

If the backend server crashes or is restarted while a job is being processed:

* The background task is terminated along with the application process.
* The job may remain stuck in the `PROCESSING` state.
* There is no independent worker process to resume the interrupted job.
* On application restart, the job would need to be triggered again, potentially resulting in records being processed from the beginning rather than resuming from the last successfully processed record.

This makes the current approach unsuitable for a production-grade, long-running enrichment workload where job durability and fault tolerance are important.

### Proposed Improvement: Celery-Based Worker Architecture

A more robust approach is to decouple the enrichment workload from the FastAPI application by using **Celery workers** with a message broker such as Redis.

With this architecture, FastAPI is responsible only for accepting the upload, creating the job, and exposing job-status APIs. The actual enrichment workload is handled independently by Celery workers.

This provides several benefits:

* **Fault isolation:** A FastAPI server restart does not terminate the worker process.
* **Durable job execution:** Jobs remain in the broker until they are picked up and acknowledged by a worker.
* **Retry support:** Failed enrichment requests can be retried using Celery's retry mechanisms.
* **Resumability:** Job and store-level processing state can be persisted in the database, allowing interrupted jobs to resume from unfinished records rather than starting from scratch.
* **Scalability:** Multiple Celery workers can process large enrichment jobs concurrently.
* **Better separation of concerns:** The API layer and long-running background workloads are independently scalable and deployable.

### Implementation Status

A Celery worker implementation has been prepared as part of the project (celery_worker.py). However, full local integration could not be completed within the assignment timeframe due to limitations around setting up and running a local Redis broker in the Windows development environment.

Therefore, the current submitted implementation uses FastAPI `BackgroundTasks`, while the Celery-based architecture represents the recommended approach for a production deployment.




# NOTE
- Please ensure the Encrich API is working by running the enrichment_simulator using teh steps given in that folder. It must run on port 8000 as mentioned since that is the URL being used to call enrich api as a third party API in this backend code.
- This backend service is being run on port 8002 as mentioned in the README.md file of Backend. Ensure thsi is also working on the same port since the Frontend service has integrated the APIs on this port.

