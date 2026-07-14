"""
Milvus vector database service for multi-embedding ensemble search.
Supports multiple vector fields for different embedding models.
"""
from typing import List, Dict, Any, Optional
import asyncio
import threading
from concurrent.futures import ThreadPoolExecutor
from pymilvus import (
    connections,
    Collection,
    FieldSchema,
    CollectionSchema,
    DataType,
    utility,
)
from config.settings import settings, EMBEDDING_DIMENSIONS
from config.logging_config import get_logger

logger = get_logger(__name__)

# Vector field naming convention
def get_vector_field_name(model_name: str) -> str:
    """Convert model name to valid Milvus field name."""
    return "emb_" + model_name.replace("-", "_").replace(".", "_")


class MilvusService:
    """Service for multi-embedding vector storage and ensemble search."""

    # Define all supported embedding fields
    EMBEDDING_FIELDS = {
        "gemini-embedding-001": {"dim": 768, "field": "emb_gemini_embedding_001"},
        "jina-embeddings-v3": {"dim": 1024, "field": "emb_jina_embeddings_v3"},
        "nomic-embed-text-v1.5": {"dim": 768, "field": "emb_nomic_embed_text_v1_5"},
        "all-MiniLM-L6-v2": {"dim": 384, "field": "emb_all_MiniLM_L6_v2"},
        "bge-small-en-v1.5": {"dim": 384, "field": "emb_bge_small_en_v1_5"},
    }

    def __init__(
        self,
        collection_name: str = "chatbot_embeddings_v2",
        dimension: Optional[int] = None,
    ):
        """Initialize the Milvus service."""
        self.host = settings.milvus_host
        self.port = settings.milvus_port
        self.collection_name = collection_name
        self.dimension = dimension or settings.milvus_dimension
        self.collection: Optional[Collection] = None
        self._connected = False
        # Executor & lock for offloading blocking pymilvus calls
        self._executor: Optional[ThreadPoolExecutor] = ThreadPoolExecutor(max_workers=8)
        self._conn_lock = threading.Lock()

        try:
            self._connect()
            self._get_or_create_collection()
            self._connected = True
            logger.info(
                f"Milvus service initialized (host: {self.host}, "
                f"collection: {self.collection_name})"
            )
        except Exception as e:
            logger.warning(
                f"Milvus unavailable at {self.host}:{self.port} — "
                f"vector search will be disabled: {e}"
            )

    def _ensure_connected(self) -> bool:
        """Attempt reconnection if not connected."""
        if self._connected and self.collection is not None:
            return True
        try:
            with self._conn_lock:
                self._connect()
                self._get_or_create_collection()
                self._connected = True
            logger.info(f"Milvus reconnected to {self.host}:{self.port}")
            return True
        except Exception as e:
            logger.warning(f"Milvus reconnection failed: {e}")
            return False

    def dispose(self):
        """Close Milvus connection."""
        try:
            if self._connected:
                connections.disconnect("default")
                self._connected = False
                logger.info("Milvus connection closed")
        except Exception as e:
            logger.warning(f"Error closing Milvus connection: {e}")

    def _connect(self) -> None:
        """Connect to Milvus server."""
        try:
            connections.connect(
                alias="default",
                host=self.host,
                port=self.port,
            )
            logger.info(f"Connected to Milvus at {self.host}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to Milvus: {e}")
            raise

    def _get_or_create_collection(self) -> None:
        """Get existing collection or create new one."""
        try:
            if utility.has_collection(self.collection_name):
                self.collection = Collection(self.collection_name)
                # load once at init to avoid repeated loads per-search
                try:
                    self.collection.load()
                except Exception:
                    pass
                logger.info(f"Loaded existing collection: {self.collection_name}")
            else:
                self._create_collection()
        except Exception as e:
            logger.error(f"Error getting collection: {e}")
            raise

    def _create_collection(self) -> None:
        """Create collection with multiple vector fields for ensemble embeddings."""
        try:
            fields = [
                FieldSchema(
                    name="id",
                    dtype=DataType.VARCHAR,
                    max_length=255,
                    is_primary=True,
                    auto_id=False,
                ),
                FieldSchema(
                    name="chatbot_id",
                    dtype=DataType.VARCHAR,
                    max_length=255,
                ),
                FieldSchema(
                    name="document_id",
                    dtype=DataType.VARCHAR,
                    max_length=255,
                ),
                FieldSchema(
                    name="chunk_id",
                    dtype=DataType.VARCHAR,
                    max_length=255,
                ),
                FieldSchema(
                    name="chunk_index",
                    dtype=DataType.INT64,
                ),
                FieldSchema(
                    name="content",
                    dtype=DataType.VARCHAR,
                    max_length=65535,
                ),
                FieldSchema(
                    name="source_type",
                    dtype=DataType.VARCHAR,
                    max_length=50,
                ),
                FieldSchema(
                    name="source_name",
                    dtype=DataType.VARCHAR,
                    max_length=255,
                ),
                FieldSchema(
                    name="metadata",
                    dtype=DataType.JSON,
                ),
            ]

            # Add vector fields only for configured embedding models
            # Combine API models and local models from settings
            active_models = set(settings.embedding_models + settings.local_embedding_models)

            for model_name in active_models:
                if model_name in self.EMBEDDING_FIELDS:
                    config = self.EMBEDDING_FIELDS[model_name]
                    fields.append(
                        FieldSchema(
                            name=config["field"],
                            dtype=DataType.FLOAT_VECTOR,
                            dim=config["dim"],
                        )
                    )
                    logger.info(f"Adding vector field for model: {model_name} (dim={config['dim']})")
                else:
                    logger.warning(f"Model {model_name} not found in EMBEDDING_FIELDS, skipping")

            schema = CollectionSchema(
                fields=fields,
                description="Multi-embedding chatbot knowledge base",
            )

            self.collection = Collection(
                name=self.collection_name,
                schema=schema,
            )

            # Create index on chatbot_id for filtering
            self.collection.create_index(
                field_name="chatbot_id",
                index_name="chatbot_id_idx",
            )

            # Create vector indexes only for active embedding fields
            for model_name in active_models:
                if model_name in self.EMBEDDING_FIELDS:
                    config = self.EMBEDDING_FIELDS[model_name]
                    self.collection.create_index(
                        field_name=config["field"],
                        index_name=f"{config['field']}_idx",
                        index_params={
                            "metric_type": "COSINE",
                            "index_type": "IVF_FLAT",
                            "params": {"nlist": 1024},
                        },
                    )
                    logger.info(f"Created index for {model_name}")

            self.collection.load()
            logger.info(f"Created multi-embedding collection: {self.collection_name}")

        except Exception as e:
            logger.error(f"Error creating collection: {e}")
            raise

    def _get_zero_vector(self, dim: int) -> List[float]:
        """Create a zero vector of given dimension."""
        return [0.0] * dim

    async def insert_embeddings(
        self,
        embeddings: Dict[str, List[List[float]]],
        chatbot_id: str,
        document_id: str,
        chunks: List[str],
        metadata: Optional[List[Dict[str, Any]]] = None,
    ) -> List[str]:
        """
        Insert document embeddings for multiple models.

        Args:
            embeddings: Dict mapping model_name -> list of embeddings
            chatbot_id: Chatbot ID for filtering
            document_id: Document identifier
            chunks: List of text chunks
            metadata: Optional metadata for each chunk

        Returns:
            List of inserted entity IDs
        """
        if not self._ensure_connected():
            raise RuntimeError("Milvus is not connected")

        try:
            if not chunks:
                return []

            num_chunks = len(chunks)

            # Prepare base data
            ids = []
            chatbot_ids = []
            document_ids = []
            chunk_ids = []
            chunk_indices = []
            contents = []
            source_types = []
            source_names = []
            metadatas = []

            for i, chunk in enumerate(chunks):
                chunk_id = f"{document_id}_{i}"
                ids.append(chunk_id)
                chatbot_ids.append(chatbot_id)
                document_ids.append(document_id)
                chunk_ids.append(chunk_id)
                chunk_indices.append(i)
                contents.append(chunk)

                meta = metadata[i] if metadata and i < len(metadata) else {}
                source_types.append(meta.get("source_type", "upload"))
                source_names.append(meta.get("source_name", meta.get("filename", "")))
                metadatas.append(meta)

            # Build data list
            data = [
                ids,
                chatbot_ids,
                document_ids,
                chunk_ids,
                chunk_indices,
                contents,
                source_types,
                source_names,
                metadatas,
            ]

            # Add vector fields only for active models (matching schema)
            active_models = set(settings.embedding_models + settings.local_embedding_models)

            for model_name, config in self.EMBEDDING_FIELDS.items():
                # Skip models not in schema
                if model_name not in active_models:
                    continue

                if model_name in embeddings:
                    # Use provided embeddings
                    model_embeddings = embeddings[model_name]
                    # Ensure correct count
                    if len(model_embeddings) != num_chunks:
                        logger.warning(
                            f"Embedding count mismatch for {model_name}: "
                            f"{len(model_embeddings)} vs {num_chunks} chunks"
                        )
                        # Pad or truncate
                        while len(model_embeddings) < num_chunks:
                            model_embeddings.append(self._get_zero_vector(config["dim"]))
                        model_embeddings = model_embeddings[:num_chunks]
                    data.append(model_embeddings)
                else:
                    # Use zero vectors for models not provided
                    zero_vectors = [self._get_zero_vector(config["dim"]) for _ in range(num_chunks)]
                    data.append(zero_vectors)

            # offload insert/flush to thread pool to avoid blocking event loop
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(self._executor, self._insert_sync, data)

            models_used = list(embeddings.keys())
            logger.info(
                f"Inserted {len(ids)} chunks for chatbot {chatbot_id}, "
                f"document {document_id} with models: {models_used}"
            )

            return ids

        except Exception as e:
            logger.error(f"Error inserting embeddings: {e}")
            raise

    @staticmethod
    def _sanitize_filter_value(value: str) -> str:
        """Sanitize a value for use in Milvus filter expressions."""
        return value.replace('"', '').replace("'", "").replace("\\", "")

    async def search(
        self,
        query_embedding: List[float],
        chatbot_id: str,
        model_name: str = "gemini-embedding-001",
        top_k: int = 20,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search using a single embedding model.

        Args:
            query_embedding: Query embedding vector
            chatbot_id: Chatbot ID to filter by
            model_name: Which embedding model to search
            top_k: Number of results
            filters: Additional filters

        Returns:
            List of search results with scores
        """
        if not self._ensure_connected():
            return []

        try:
            if model_name not in self.EMBEDDING_FIELDS:
                logger.warning(f"Unknown model: {model_name}, using default")
                model_name = "gemini-embedding-001"

            config = self.EMBEDDING_FIELDS[model_name]
            vector_field = config["field"]

            search_params = {
                "metric_type": "COSINE",
                "params": {"nprobe": 10},
            }

            safe_chatbot_id = self._sanitize_filter_value(chatbot_id)
            expr = f'chatbot_id == "{safe_chatbot_id}"'

            if filters:
                if filters.get("document_id"):
                    safe_doc_id = self._sanitize_filter_value(filters["document_id"])
                    expr += f' && document_id == "{safe_doc_id}"'

            loop = asyncio.get_running_loop()
            results = await loop.run_in_executor(
                self._executor,
                self._search_sync,
                query_embedding,
                vector_field,
                search_params,
                top_k,
                expr,
            )

            return results

        except Exception as e:
            logger.error(f"Error searching Milvus: {e}")
            return []

    async def ensemble_search(
        self,
        query_embeddings: Dict[str, List[float]],
        chatbot_id: str,
        top_k: int = 20,
        fusion_method: str = "rrf",
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Ensemble search across multiple embedding models.

        Args:
            query_embeddings: Dict mapping model_name -> query embedding
            chatbot_id: Chatbot ID
            top_k: Results per model before fusion
            fusion_method: 'rrf' or 'weighted'
            filters: Additional filters

        Returns:
            Fused and ranked results
        """
        if not self._ensure_connected():
            return []

        try:
            all_results: Dict[str, List[Dict]] = {}

            # Search each model
            for model_name, query_emb in query_embeddings.items():
                if model_name in self.EMBEDDING_FIELDS:
                    results = await self.search(
                        query_embedding=query_emb,
                        chatbot_id=chatbot_id,
                        model_name=model_name,
                        top_k=top_k,
                        filters=filters,
                    )
                    all_results[model_name] = results
                    logger.debug(f"Model {model_name} returned {len(results)} results")

            # Fuse results using RRF
            fused = self._fuse_results(all_results, method=fusion_method)

            logger.info(
                f"Ensemble search for chatbot {chatbot_id}: "
                f"{len(query_embeddings)} models, {len(fused)} fused results"
            )

            return fused[:top_k]

        except Exception as e:
            logger.error(f"Error in ensemble search: {e}")
            return []

    def _fuse_results(
        self,
        results_by_model: Dict[str, List[Dict]],
        method: str = "rrf",
        rrf_k: int = 60,
    ) -> List[Dict[str, Any]]:
        """Fuse results from multiple models using RRF or weighted average."""
        scores: Dict[str, float] = {}
        items: Dict[str, Dict] = {}

        for model_name, results in results_by_model.items():
            for rank, item in enumerate(results):
                chunk_id = item.get("chunk_id") or item.get("id")
                if not chunk_id:
                    continue

                if method == "rrf":
                    # Reciprocal Rank Fusion
                    scores[chunk_id] = scores.get(chunk_id, 0) + 1 / (rrf_k + rank + 1)
                else:
                    # Weighted by similarity score
                    scores[chunk_id] = max(scores.get(chunk_id, 0), item.get("score", 0))

                if chunk_id not in items:
                    items[chunk_id] = item.copy()

        # Sort by fusion score
        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)

        results = []
        for chunk_id in sorted_ids:
            item = items[chunk_id]
            item["fusion_score"] = scores[chunk_id]
            results.append(item)

        return results

    # --- Blocking helpers run in threadpool ---
    def _search_sync(
        self,
        query_embedding: List[float],
        vector_field: str,
        search_params: Dict[str, Any],
        top_k: int,
        expr: str,
    ) -> List[Dict[str, Any]]:
        """Synchronous helper that performs collection.search and formats results."""
        try:
            # Use lock to protect underlying collection/connection while searching
            with self._conn_lock:
                results = self.collection.search(
                    data=[query_embedding],
                    anns_field=vector_field,
                    param=search_params,
                    limit=top_k,
                    expr=expr,
                    output_fields=[
                        "chatbot_id",
                        "document_id",
                        "chunk_id",
                        "chunk_index",
                        "content",
                        "source_type",
                        "source_name",
                        "metadata",
                    ],
                )

            formatted_results = []
            for hit in results[0]:
                formatted_results.append({
                    "id": hit.id,
                    "chunk_id": hit.entity.get("chunk_id"),
                    "score": hit.score,
                    "chatbot_id": hit.entity.get("chatbot_id"),
                    "document_id": hit.entity.get("document_id"),
                    "chunk_index": hit.entity.get("chunk_index"),
                    "content": hit.entity.get("content"),
                    "embedding_model": vector_field,
                    "source_type": hit.entity.get("source_type"),
                    "source_name": hit.entity.get("source_name"),
                    "metadata": hit.entity.get("metadata", {}),
                })

            return formatted_results
        except Exception as e:
            logger.error(f"Error searching Milvus (sync): {e}")
            return []

    def _insert_sync(self, data: List[Any]) -> None:
        try:
            with self._conn_lock:
                self.collection.insert(data)
                self.collection.flush()
        except Exception as e:
            logger.error(f"Error inserting embeddings (sync): {e}")

    def _delete_sync(self, expr: str) -> None:
        try:
            with self._conn_lock:
                self.collection.delete(expr)
                self.collection.flush()
        except Exception as e:
            logger.error(f"Error deleting (sync): {e}")

    def _query_sync(self, expr: str, output_fields: List[str], limit: Optional[int] = None) -> List[Dict[str, Any]]:
        try:
            with self._conn_lock:
                if limit:
                    results = self.collection.query(expr=expr, output_fields=output_fields, limit=limit)
                else:
                    results = self.collection.query(expr=expr, output_fields=output_fields)
            return results
        except Exception as e:
            logger.error(f"Error querying Milvus (sync): {e}")
            return []

    async def delete_document(self, document_id: str) -> int:
        """Delete all embeddings for a document."""
        if not self._ensure_connected():
            return 0
        try:
            safe_id = self._sanitize_filter_value(document_id)
            expr = f'document_id == "{safe_id}"'

            loop = asyncio.get_running_loop()
            await loop.run_in_executor(self._executor, self._delete_sync, expr)

            logger.info(f"Deleted document {document_id} from Milvus")
            return 1

        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            raise

    async def delete_chatbot(self, chatbot_id: str) -> int:
        """Delete all embeddings for a chatbot."""
        if not self._ensure_connected():
            return 0
        try:
            safe_id = self._sanitize_filter_value(chatbot_id)
            expr = f'chatbot_id == "{safe_id}"'

            loop = asyncio.get_running_loop()
            await loop.run_in_executor(self._executor, self._delete_sync, expr)

            logger.info(f"Deleted all embeddings for chatbot {chatbot_id}")
            return 1

        except Exception as e:
            logger.error(f"Error deleting chatbot: {e}")
            raise

    async def get_chatbot_chunk_count(self, chatbot_id: str) -> int:
        """Get the number of chunks for a chatbot."""
        if not self._ensure_connected():
            return 0
        try:
            safe_id = self._sanitize_filter_value(chatbot_id)
            expr = f'chatbot_id == "{safe_id}"'
            loop = asyncio.get_running_loop()
            results = await loop.run_in_executor(self._executor, self._query_sync, expr, ["id"])
            return len(results)

        except Exception as e:
            logger.error(f"Error getting chunk count: {e}")
            return 0

    async def get_stats(self, chatbot_id: Optional[str] = None) -> Dict[str, Any]:
        """Get collection statistics."""
        if not self._ensure_connected():
            return {"count": 0, "models": list(self.EMBEDDING_FIELDS.keys())}
        try:
            stats = {
                "name": self.collection_name,
                "count": self.collection.num_entities,
                "models": list(self.EMBEDDING_FIELDS.keys()),
            }

            if chatbot_id:
                stats["chatbot_chunks"] = await self.get_chatbot_chunk_count(chatbot_id)

            return stats

        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {}

    async def has_knowledge_base(self, chatbot_id: str) -> bool:
        """Check if a chatbot has any chunks."""
        count = await self.get_chatbot_chunk_count(chatbot_id)
        return count > 0

    async def get_chunks_for_bm25(self, chatbot_id: str, limit: int = 10000) -> List[Dict[str, str]]:
        """
        Get all chunks for a chatbot (for BM25 index building).

        Returns:
            List of dicts with chunk_id and content
        """
        if not self._ensure_connected():
            return []
        try:
            safe_id = self._sanitize_filter_value(chatbot_id)
            expr = f'chatbot_id == "{safe_id}"'
            loop = asyncio.get_running_loop()
            results = await loop.run_in_executor(self._executor, self._query_sync, expr, ["chunk_id", "content"], limit)
            return [{"chunk_id": r["chunk_id"], "content": r["content"]} for r in results]

        except Exception as e:
            logger.error(f"Error getting chunks for BM25: {e}")
            return []


# Global instance
_milvus_service: Optional[MilvusService] = None


def get_milvus_service() -> MilvusService:
    """Get or create the global Milvus service instance."""
    global _milvus_service
    if _milvus_service is None:
        _milvus_service = MilvusService()
    return _milvus_service
