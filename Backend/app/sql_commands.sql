-- Enums
CREATE TYPE job_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- Jobs Table
CREATE TABLE IF NOT EXISTS jobs (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status job_status DEFAULT 'PENDING',
    total_records INT NOT NULL DEFAULT 0,
    successful_records INT NOT NULL DEFAULT 0,
    failed_records INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Stores Table (Links each uploaded store instance to a batch job)
CREATE TABLE IF NOT EXISTS stores (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id VARCHAR(100) NOT NULL,
    store_name VARCHAR(250),
    address VARCHAR(250),
    city VARCHAR(100),
    state VARCHAR(100), 
    country VARCHAR(100),
    job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enrichments Table (Master table with 1:1 unique store_id relationship)
CREATE TABLE IF NOT EXISTS enrichments (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id VARCHAR(100) NOT NULL UNIQUE,
    est_monthly_footfall BIGINT,
    est_monthly_revenue DECIMAL(15, 2),
    store_size_sqft BIGINT,
    status job_status DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Score Tier Table (Stores the calculated score and tier for each store)
CREATE TABLE IF NOT EXISTS store_tier_results (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id INT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    store_id VARCHAR(100) NOT NULL,
    score DECIMAL(5, 2) NOT NULL,
    tier VARCHAR(20) NOT NULL,
    footfall_snapshot BIGINT,
    revenue_snapshot DECIMAL(15, 2),
    size_sqft_snapshot BIGINT,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tier_job_store UNIQUE (job_id, store_id)
);

-- Indexes 
CREATE INDEX IF NOT EXISTS idx_stores_job_id ON stores(job_id);
CREATE INDEX IF NOT EXISTS idx_stores_store_id ON stores(store_id);
CREATE INDEX IF NOT EXISTS idx_enrichments_store_id ON enrichments(store_id);
CREATE INDEX IF NOT EXISTS idx_enrichments_status ON enrichments(status);