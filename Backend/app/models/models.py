import enum
import uuid
from datetime import datetime
from pydantic import BaseModel

class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class TierCalculationRequest(BaseModel):
    job_id: int
    footfall_bar: float
    footfall_weight: float        
    revenue_bar: float    
    revenue_weight: float
    size_bar: float
    size_weight: float
    large_tier_threshold: float
    medium_tier_threshold: float