#!/usr/bin/env python3
"""Verify the published firmware artifact sizes and SHA-256 digests."""
from hashlib import sha256
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "firmware/manifest.json").read_text())
for artifact in manifest["artifacts"]:
    path = ROOT / "firmware" / artifact["name"]
    data = path.read_bytes()
    digest = sha256(data).hexdigest()
    assert len(data) == artifact["size"], (path, len(data), artifact["size"])
    assert digest == artifact["sha256"], (path, digest, artifact["sha256"])
    print(f"OK  {path.relative_to(ROOT)}  {len(data)} bytes  {digest}")
