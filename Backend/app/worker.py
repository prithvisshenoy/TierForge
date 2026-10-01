import asyncio
import httpx
from datetime import datetime
from utils.db_utils import execute_query, execute_statement

ENRICHMENT_API_URL = "http://localhost:8000/enrich"  
BATCH_SIZE = 50         
MAX_CONCURRENCY = 5     
MAX_RETRIES = 3
TIMEOUT_SECONDS = 5.0

def _db_update_status(table: str, status: str, record_id: int):
    """Synchronous helper function to run in a thread."""
    execute_statement(
        f"UPDATE {table} SET status = :status, updated_at = :now WHERE id = :id",
        {"status": status, "now": datetime.utcnow(), "id": record_id}
    )

def _db_save_enrichment_success(store_id: int, data: dict):
    execute_statement(
        """
        UPDATE enrichments 
        SET est_monthly_footfall = :footfall,
            est_monthly_revenue = :revenue,
            store_size_sqft = :size_sqft,
            status = 'COMPLETED',
            last_error = NULL,
            updated_at = :now
        WHERE store_id = :store_id;
        """,
        {
            "footfall": data.get("estimated_monthly_footfall"),
            "revenue": data.get("estimated_monthly_revenue"),
            "size_sqft": data.get("store_size_sqft"),
            "now": datetime.utcnow(),
            "store_id": store_id
        }
    )

def _db_record_retry_error(store_id: int, attempt: int, err: str):
    execute_statement(
        "UPDATE enrichments SET retry_count = :attempt, last_error = :err, updated_at = :now WHERE store_id = :store_id",
        {"attempt": attempt, "err": err, "now": datetime.utcnow(), "store_id": store_id}
    )

def _sync_job_progress_from_db(job_id: int):
    sql = """
        UPDATE jobs j
        SET successful_records = counts.success_count,
            failed_records = counts.failed_count,
            updated_at = NOW()
        FROM (
            SELECT 
                COUNT(DISTINCT (s.store_id)) FILTER (WHERE e.status = 'COMPLETED') AS success_count,
                COUNT(DISTINCT (s.store_id)) FILTER (WHERE e.status = 'FAILED') AS failed_count
            FROM stores s
            JOIN enrichments e ON e.store_id = s.store_id
            WHERE e.job_id = :job_id
        ) counts
        WHERE j.id = :job_id;
    """
    execute_statement(sql, {"job_id": job_id})

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
    await asyncio.to_thread(_db_update_status, "enrichments", "PROCESSING", store["enrichment_id"])

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
                    await asyncio.to_thread(_db_save_enrichment_success, store["store_id"], data)
                    return True

                last_err = f"HTTP {response.status_code}: {response.text[:200]}"
                await asyncio.to_thread(_db_record_retry_error, store["store_id"], attempt, last_err)

                if attempt < MAX_RETRIES:
                    await asyncio.sleep(backoff)
                    backoff *= 2

            except (httpx.TimeoutException, httpx.RequestError) as exc:
                last_err = f"Request error: {str(exc)[:200]}"
                await asyncio.to_thread(_db_record_retry_error, store["store_id"], attempt, last_err)

                if attempt < MAX_RETRIES:
                    await asyncio.sleep(backoff)
                    backoff *= 2
                    
        await asyncio.to_thread(_db_update_status, "enrichments", "FAILED", store["enrichment_id"])
        return False


def _fetch_job_stores(job_id: int):
    return execute_query(
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

def _update_job_counters(job_id: int, success_count: int, failed_count: int):
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


async def run_batch_enrichment_job(job_id: int):
    try:
        now = datetime.utcnow()
        await asyncio.to_thread(_db_update_status, "jobs", "PROCESSING", job_id)

        stores = await asyncio.to_thread(_fetch_job_stores, job_id)
        semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

        async with httpx.AsyncClient() as client:
            for i in range(0, len(stores), BATCH_SIZE):
                batch = stores[i : i + BATCH_SIZE]
                
                tasks = [
                    enrich_single_store(store, client, semaphore)
                    for store in batch
                ]
                
                await asyncio.gather(*tasks)

                await asyncio.to_thread(_sync_job_progress_from_db, job_id)

        await asyncio.to_thread(
            execute_statement,
            """
            UPDATE jobs 
            SET status = 'COMPLETED', 
                completed_at = :now, 
                updated_at = :now 
            WHERE id = :job_id
            """,
            {"now": datetime.utcnow(), "job_id": job_id}
        )

    except Exception as e:
        await asyncio.to_thread(_db_update_status, "jobs", "FAILED", job_id)
        raise e