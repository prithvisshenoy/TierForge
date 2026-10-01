CREATE TABLE IF NOT EXISTS stores (
	id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	store_id VARCHAR(100) NOT NULL,
	store_name VARCHAR(250),
	address VARCHAR(250),
	city VARCHAR(100),
	state VARCHAR(100), 
	country VARCHAR(100),
	job_id INT,
	created_at TIMESTAMP
);


CREATE TYPE job_status as ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE IF NOT EXISTS jobs (
	id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	status job_status,
	total_records INT,
	successful_records INT,
	failed_records INT,
	created_at TIMESTAMP,
	updated_at TIMESTAMP,
	completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrichments (
	id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	store_id VARCHAR(100) NOT NULL,
	est_monthly_footfall BIGINT,
	est_monthly_revenue DECIMAL,
	store_size_sqft BIGINT,
	status job_status,
	retry_count INT,
	last_error TEXT,
	created_at TIMESTAMP,
	updated_at TIMESTAMP
);