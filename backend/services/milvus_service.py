"""
Milvus vector database service for storing and searching document embeddings.
Supports chatbot_id filtering for multi-tenant RAG.
Uses Gemini text-embedding-004 (768 dimensions).
"""
from typing import List, Dict, Any, Optional, Tuple
from pymilvus import (
    connections,
    Collection,
    FieldSchema,
    CollectionSchema,
    DataType,
    utility,
)
import numpy as np
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class MilvusService:
    """Service for interacting with Milvus vector database."""

    def __init__(
        self,
        collection_name: str = "chatbot_embeddings",
        dimension: Optional[int] = None,
    ):
        """
        Initialize the Milvus service.

        Args:
            collection_name: Name of the collection
            dimension: Embedding dimension (defaults to settings.milvus_dimension)
        """
        self.host = settings.milvus_host
        self.port = settings.milvus_port
        self.collection_name = collection_name
        self.dimension = dimension or settings.milvus_dimension
        self.collection: Optional[Collection] = None

        self._connect()
        self._get_or_create_collection()

        logger.info(
            f"Milvus service initialized (host: {self.host}, "
            f"collection: {self.collection_name}, dim: {self.dimension})"
        )

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
                self.collection.load()
                logger.info(f"Loaded existing collection: {self.collection_name}")
            else:
                self._create_collection()
        except Exception as e:
            logger.error(f"Error getting collection: {e}")
            raise

    def _create_collection(self) -> None:
        """Create a new collection for chatbot embeddings."""
        try:
            # Define schema with chatbot_id for filtering
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
                    name="embedding",
                    dtype=DataType.FLOAT_VECTOR,
                    dim=self.dimension,
                ),
                FieldSchema(
                    name="embedding_model",
                    dtype=DataType.VARCHAR,
                    max_length=100,
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

            schema = CollectionSchema(
                fields=fields,
                description="Chatbot knowledge base embeddings",
            )

            self.collection = Collection(
                name=self.collection_name,
                schema=schema,
            )

            # Create indexes for efficient filtering
            self.collection.create_index(
                field_name="chatbot_id",
                index_name="chatbot_id_idx",
            )
            self.collection.create_index(
                field_name="embedding",
                index_name="embedding_idx",
            )

            self.collection.load()

            logger.info(f"Created collection: {self.collection_name}")

        except Exception as e:
            logger.error(f"Error creating collection: {e}")
            raise

    async def insert_embeddings(
        self,
        embeddings: List[List[float]],
        chatbot_id: str,
        document_id: str,
        chunks: List[str],
        embedding_model: str,
        metadata: Optional[List[Dict[str, Any]]] = None,
    ) -> List[str]:
        """
        Insert document embeddings for a chatbot.

        Args:
            embeddings: List of embedding vectors
            chatbot_id: Chatbot ID for filtering
            document_id: Document identifier
            chunks: List of text chunks
            embedding_model: Name of embedding model
            metadata: Optional metadata for each chunk

        Returns:
            List of inserted entity IDs
        """
        try:
            if not embeddings:
                return []

            # Pad embeddings if needed
            padded_embeddings = [
                self._pad_embedding(emb) if len(emb) < self.dimension else emb[:self.dimension]
                for emb in embeddings
            ]

            # Prepare data
            ids = []
            chatbot_ids = []
            document_ids = []
            chunk_ids = []
            chunk_indices = []
            contents = []
            embedding_models = []
            source_types = []
            source_names = []
            metadatas = []

            for i, (emb, chunk) in enumerate(zip(padded_embeddings, chunks)):
                chunk_id = f"{document_id}_{i}"
                ids.append(chunk_id)
                chatbot_ids.append(chatbot_id)
                document_ids.append(document_id)
                chunk_ids.append(chunk_id)
                chunk_indices.append(i)
                contents.append(chunk)
                embedding_models.append(embedding_model)

                meta = metadata[i] if metadata and i < len(metadata) else {}
                source_types.append(meta.get("source_type", "upload"))
                source_names.append(meta.get("source_name", meta.get("filename", "")))
                metadatas.append(meta)

            # Insert
            data = [
                ids,
                chatbot_ids,
                document_ids,
                chunk_ids,
                chunk_indices,
                contents,
                padded_embeddings,
                embedding_models,
                source_types,
                source_names,
                metadatas,
            ]

            self.collection.insert(data)
            self.collection.flush()

            logger.info(
                f"Inserted {len(ids)} embeddings for chatbot {chatbot_id}, "
                f"document {document_id} using {embedding_model}"
            )

            return ids

        except Exception as e:
            logger.error(f"Error inserting embeddings: {e}")
            raise

    def _pad_embedding(self, embedding: List[float]) -> List[float]:
        """Pad embedding to target dimension."""
        if len(embedding) >= self.dimension:
            return embedding[:self.dimension]
        return embedding + [0.0] * (self.dimension - len(embedding))

    @staticmethod
    def _sanitize_filter_value(value: str) -> str:
        """Sanitize a value for use in Milvus filter expressions."""
        # Remove any characters that could break the filter expression
        return value.replace('"', '').replace("'", "").replace("\\", "")

    async def search(
        self,
        query_embedding: List[float],
        chatbot_id: str,
        embedding_model: Optional[str] = None,
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents within a chatbot's knowledge base.

        Args:
            query_embedding: Query embedding vector
            chatbot_id: Chatbot ID to filter by
            embedding_model: Filter by embedding model
            top_k: Number of results to return
            filters: Additional filters

        Returns:
            List of search results with scores
        """
        try:
            # Pad query embedding if needed
            padded_query = self._pad_embedding(query_embedding)

            # Build search params
            search_params = {
                "metric_type": "COSINE",
                "params": {"nprobe": 10},
            }

            # Build filter expression - ALWAYS filter by chatbot_id
            safe_chatbot_id = self._sanitize_filter_value(chatbot_id)
            expr = f'chatbot_id == "{safe_chatbot_id}"'

            if embedding_model:
                safe_model = self._sanitize_filter_value(embedding_model)
                expr += f' && embedding_model == "{safe_model}"'

            if filters:
                if filters.get("document_id"):
                    safe_doc_id = self._sanitize_filter_value(filters["document_id"])
                    expr += f' && document_id == "{safe_doc_id}"'
                if filters.get("source_type"):
                    safe_source = self._sanitize_filter_value(filters["source_type"])
                    expr += f' && source_type == "{safe_source}"'

            # Execute search
            self.collection.load()
            results = self.collection.search(
                data=[padded_query],
                anns_field="embedding",
                param=search_params,
                limit=top_k,
                expr=expr,
                output_fields=[
                    "chatbot_id",
                    "document_id",
                    "chunk_id",
                    "chunk_index",
                    "content",
                    "embedding_model",
                    "source_type",
                    "source_name",
                    "metadata",
                ],
            )

            # Format results
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
                    "embedding_model": hit.entity.get("embedding_model"),
                    "source_type": hit.entity.get("source_type"),
                    "source_name": hit.entity.get("source_name"),
                    "metadata": hit.entity.get("metadata", {}),
                })

            logger.info(
                f"Search returned {len(formatted_results)} results for chatbot {chatbot_id}"
            )

            return formatted_results

        except Exception as e:
            logger.error(f"Error searching Milvus: {e}")
            raise

    async def delete_document(self, document_id: str) -> int:
        """
        Delete all embeddings for a document.

        Args:
            document_id: Document to delete

        Returns:
            Number of entities deleted
        """
        try:
            safe_id = self._sanitize_filter_value(document_id)
            expr = f'document_id == "{safe_id}"'

            self.collection.load()
            self.collection.delete(expr)
            self.collection.flush()

            logger.info(f"Deleted document {document_id} from Milvus")
            return 1

        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            raise

    async def delete_chatbot(self, chatbot_id: str) -> int:
        """
        Delete all embeddings for a chatbot.

        Args:
            chatbot_id: Chatbot to delete

        Returns:
            Number of entities deleted
        """
        try:
            safe_id = self._sanitize_filter_value(chatbot_id)
            expr = f'chatbot_id == "{safe_id}"'

            self.collection.load()
            self.collection.delete(expr)
            self.collection.flush()

            logger.info(f"Deleted all embeddings for chatbot {chatbot_id}")
            return 1

        except Exception as e:
            logger.error(f"Error deleting chatbot: {e}")
            raise

    async def get_chatbot_chunk_count(self, chatbot_id: str) -> int:
        """
        Get the number of chunks for a chatbot.

        Args:
            chatbot_id: Chatbot ID

        Returns:
            Number of chunks
        """
        try:
            self.collection.load()
            expr = f'chatbot_id == "{chatbot_id}"'
            results = self.collection.query(
                expr=expr,
                output_fields=["id"],
            )
            return len(results)

        except Exception as e:
            logger.error(f"Error getting chunk count: {e}")
            return 0

    async def get_stats(self, chatbot_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get collection statistics.

        Args:
            chatbot_id: Optional chatbot ID to get stats for

        Returns:
            Statistics dictionary
        """
        try:
            self.collection.load()

            stats = {
                "name": self.collection_name,
                "count": self.collection.num_entities,
                "dimension": self.dimension,
            }

            if chatbot_id:
                stats["chatbot_chunks"] = await self.get_chatbot_chunk_count(chatbot_id)

            return stats

        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {}

    async def has_knowledge_base(self, chatbot_id: str) -> bool:
        """
        Check if a chatbot has any chunks in its knowledge base.

        Args:
            chatbot_id: Chatbot ID

        Returns:
            True if chatbot has chunks
        """
        count = await self.get_chatbot_chunk_count(chatbot_id)
        return count > 0


# Global instance
_milvus_service: Optional[MilvusService] = None


def get_milvus_service() -> MilvusService:
    """Get or create the global Milvus service instance."""
    global _milvus_service
    if _milvus_service is None:
        _milvus_service = MilvusService()
    return _milvus_service
