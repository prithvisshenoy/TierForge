import asyncio
import httpx
from datetime import datetime
from utils.db_utils import execute_query, execute_statement

ENRICHMENT_API_URL = "http://localhost:8000/enrich"  
BATCH_SIZE = 50         
MAX_CONCURRENCY = 5     
MAX_RETRIES = 3
TIMEOUT_SECONDS = 5.0

async def enrich_single_store(
    store: dict, 
    client: httpx.AsyncClient, 
    semaphore: asyncio.Semaphore
) -> bool:
    payload = {
        "store_id": store["store_id"],
        "store_name": store["store_name"],
        "address": store["address"],
        "city": store["city"],
        "state": store["state"]
    }

    execute_statement(
        "UPDATE enrichments SET status = 'PROCESSING', updated_at = :now WHERE id = :enrichment_id",
        {"now": datetime.utcnow(), "enrichment_id": store["enrichment_id"]}
    )

    backoff = 1.0

    async with semaphore:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = await client.post(
                    ENRICHMENT_API_URL, 
                    json=payload, 
                    timeout=TIMEOUT_SECONDS
                )

                if response.status_code == 200:
                    data = response.json()
                    execute_statement(
                        """
                        UPDATE enrichments 
                        SET est_monthly_footfall = :footfall,
                            est_monthly_revenue = :revenue,
                            store_size_sqft = :size_sqft,
                            status = 'COMPLETED',
                            last_error = NULL,
                            updated_at = :now
                        WHERE id = :enrichment_id;
                        """,
                        {
                            "footfall": data.get("estimated_monthly_footfall"),
                            "revenue": data.get("estimated_monthly_revenue"),
                            "size_sqft": data.get("store_size_sqft"),
                            "now": datetime.utcnow(),
                            "enrichment_id": store["enrichment_id"]
                        }
                    )
                    return True

                # Transient failure (e.g. 429 Rate Limit or 5xx Server Error)
                last_err = f"HTTP {response.status_code}: {response.text[:200]}"
                execute_statement(
                    "UPDATE enrichments SET retry_count = :attempt, last_error = :err, updated_at = :now WHERE id = :enrichment_id",
                    {"attempt": attempt, "err": last_err, "now": datetime.utcnow(), "enrichment_id": store["enrichment_id"]}
                )

                if attempt < MAX_RETRIES:
                    await asyncio.sleep(backoff)
                    backoff *= 2  # Exponential backoff

            except (httpx.TimeoutException, httpx.RequestError) as exc:
                last_err = f"Request error: {str(exc)[:200]}"
                execute_statement(
                    "UPDATE enrichments SET retry_count = :attempt, last_error = :err, updated_at = :now WHERE id = :enrichment_id",
                    {"attempt": attempt, "err": last_err, "now": datetime.utcnow(), "enrichment_id": store["enrichment_id"]}
                )

                if attempt < MAX_RETRIES:
                    await asyncio.sleep(backoff)
                    backoff *= 2

        # Retries exhausted -> Mark FAILED
        execute_statement(
            "UPDATE enrichments SET status = 'FAILED', updated_at = :now WHERE id = :enrichment_id",
            {"now": datetime.utcnow(), "enrichment_id": store["enrichment_id"]}
        )
        return False


async def run_batch_enrichment_job(job_id: int):
    """Background engine orchestrating store enrichment jobs in batches."""
    try:
        now = datetime.utcnow()
        execute_statement(
            "UPDATE jobs SET status = 'PROCESSING', updated_at = :now WHERE id = :job_id",
            {"now": now, "job_id": job_id}
        )

        # Fetch all stores and enrichment IDs for this job
        stores = execute_query(
            """
            SELECT 
                s.id AS store_pk,
                s.store_id,
                s.store_name,
                s.address,
                s.city,
                s.state,
                e.id AS enrichment_id
            FROM stores s
            JOIN enrichments e ON e.store_id = s.store_id
            WHERE s.job_id = :job_id;
            """,
            {"job_id": job_id}
        )

        semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

        async with httpx.AsyncClient() as client:
            # Chunk records into batches
            for i in range(0, len(stores), BATCH_SIZE):
                batch = stores[i : i + BATCH_SIZE]
                
                tasks = [
                    enrich_single_store(store, client, semaphore)
                    for store in batch
                ]
                
                results = await asyncio.gather(*tasks)

                success_count = sum(1 for r in results if r)
                failed_count = len(results) - success_count

                execute_statement(
                    """
                    UPDATE jobs 
                    SET successful_records = successful_records + :success,
                        failed_records = failed_records + :failed,
                        updated_at = :now
                    WHERE id = :job_id;
                    """,
                    {
                        "success": success_count,
                        "failed": failed_count,
                        "now": datetime.utcnow(),
                        "job_id": job_id
                    }
                )

        now = datetime.utcnow()
        execute_statement(
            """
            UPDATE jobs 
            SET status = 'COMPLETED',
                completed_at = :now,
                updated_at = :now
            WHERE id = :job_id;
            """,
            {"now": now, "job_id": job_id}
        )

    except Exception:
        execute_statement(
            "UPDATE jobs SET status = 'FAILED', updated_at = :now WHERE id = :job_id",
            {"now": datetime.utcnow(), "job_id": job_id}
        )