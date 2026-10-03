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
- **Code quality:** ESLint

# Architecture



# NOTE
- Please ensure the Encrich API is working by running the enrichment_simulator using teh steps given in that folder. It must run on port 8000 as mentioned since that is the URL being used to call enrich api as a third party API in this backend code.
- This backend service is being run on port 8002 as mentioned in the README.md file of Backend. Ensure thsi is also working on the same port since the Frontend service has integrated the APIs on this port.

