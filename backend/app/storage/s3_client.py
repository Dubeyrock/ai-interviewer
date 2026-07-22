from pathlib import Path
from typing import Optional


class S3Client:
    def __init__(self, bucket: str = "") -> None:
        self.bucket = bucket

    def upload_bytes(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        # Local fallback placeholder.
        out_dir = Path("storage")
        out_dir.mkdir(parents=True, exist_ok=True)
        path = out_dir / key
        path.write_bytes(data)
        return str(path)

    def download_bytes(self, key: str) -> Optional[bytes]:
        path = Path("storage") / key
        if path.exists():
            return path.read_bytes()
        return None
