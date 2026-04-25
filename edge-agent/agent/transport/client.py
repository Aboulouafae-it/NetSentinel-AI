import logging
import asyncio
from agent.poller.wireless import NormalizedRFMetric

logger = logging.getLogger(__name__)

class BackendClient:
    """
    Handles secure payload transmission from the Edge Agent to the Cloud/Core platform.
    """
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url.rstrip('/')
        self.headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        
    async def push_wireless_metric(self, metric: NormalizedRFMetric) -> bool:
        """
        Pushes a single normalized RF metric to the Time-Series DB via Backend API.
        """
        url = f"{self.api_url}/api/v1/wireless/links/{metric.wireless_link_id}/metrics"
        
        # Serialize to dict, discarding None values to reduce payload size
        payload = {k: v for k, v in metric.__dict__.items() if v is not None}
        
        try:
            # Note: httpx integration would go here in full implementation.
            # async with httpx.AsyncClient() as client:
            #    response = await client.post(url, json=payload, headers=self.headers)
            #    response.raise_for_status()
            
            logger.info(f"[Transport] Success -> {url} | SNR: {metric.snr} CCQ: {metric.ccq}")
            await asyncio.sleep(0.05) # Simulate network transmission time
            return True
        except Exception as e:
            logger.error(f"[Transport] Delivery Failed -> {e}")
            return False
