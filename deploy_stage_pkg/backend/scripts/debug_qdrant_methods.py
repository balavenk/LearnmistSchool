from qdrant_client import QdrantClient
import inspect
sig = inspect.signature(QdrantClient.query_points)
print(str(sig))
