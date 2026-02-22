import hmac, hashlib
from app.core.config import settings

_HMAC_SECRET = settings.LINE_ID_HMAC_SECRET.encode("utf-8")

def line_id_to_hash(line_id: str) -> str:
    normalized = line_id.strip()
    return hmac.new(_HMAC_SECRET, normalized.encode('utf-8'), hashlib.sha256).hexdigest()