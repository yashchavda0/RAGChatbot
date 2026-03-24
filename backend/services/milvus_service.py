"""
Milvus vector database service for storing and searching document embeddings.
Supports multiple embedding models with proper collection management.
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
from config import get_embedding_dimension

logger = get_logger(__name__)


class MilvusService:
    """Service for interacting with Milvus vector database."""

    def __init__(self):
        """Initialize the Milvus service."""
        self.host = settings.milvus_host
        self.port = settings.milvus_port
        self.collection_name = settings.milvus_collection_name
        self.dimension = settings.milvus_dimension
        self.collection: Optional[Collection] = None

        self._connect()
        self._get_or_create_collection()

        logger.info(
            f"Milvus service initialized (host: {self.host}, "
            f"collection: {self.collection_name})"
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
        """Create a new collection for document embeddings."""
        try:
            # Define schema
            fields = [
                FieldSchema(
                    name="id",
                    dtype=DataType.VARCHAR,
                    max_length=255,
                    is_primary=True,
                    auto_id=False,
                    ),
                FieldSchema(
                    name="embedding",
                    dtype=DataType.FLOAT_VECTOR,
                    dim=self.dimension,
                    ),
                FieldSchema(
                    name="document_id",
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
                    name="embedding_model",
                    dtype=DataType.VARCHAR,
                    max_length=50,
                    ),
                FieldSchema(
                    name="embedding_dim",
                    dtype=DataType.INT64,
                    ),
                FieldSchema(
                    name="metadata",
                    dtype=DataType.JSON,
                    ),
            ]

            schema = CollectionSchema(fields=fields, description="Document embeddings")

            # Create collection
            self.collection = Collection(
                name=self.collection_name,
                schema=schema,
            )

            # Create index
            index_params = {
                "index_type": "HNSW",
                "metric_type": "COSINE",
                "params": {
                    "M": 16,
                    "efConstruction": 256,
                },
            }

            self.collection.create_index(
                field_name="embedding",
                index_params=index_params,
            )

            logger.info(f"Created new collection: {self.collection_name}")

        except Exception as e:
            logger.error(f"Error creating collection: {e}")
            raise

    async def insert_embeddings(
        self,
        embeddings: List[List[float]],
        document_id: str,
        chunks: List[str],
        embedding_model: str,
        metadata: Optional[List[Dict[str, Any]]] = None,
    ) -> List[str]:
        """
        Insert document embeddings into Milvus.

        Args:
            embeddings: List of embedding vectors
            document_id: Document identifier
            chunks: List of text chunks
            embedding_model: Name of embedding model used
            metadata: Optional metadata for each chunk

        Returns:
            List of inserted entity IDs
        """
        try:
            entity_count = len(embeddings)
            ids = []
            chunk_indices = []
            document_ids = []
            contents = []
            embedding_models = []
            embedding_dims = []
            metadatas = []
            padded_embeddings = []

            # Get the actual model dimension
            model_dim = get_embedding_dimension(embedding_model)

            for i, (emb, chunk) in enumerate(zip(embeddings, chunks)):
                # ID format: {document_id}_{chunk_index}_{model_name}
                entity_id = f"{document_id}_{i}_{embedding_model}"

                ids.append(entity_id)
                chunk_indices.append(i)
                document_ids.append(document_id)
                contents.append(chunk)
                embedding_models.append(embedding_model)
                embedding_dims.append(len(emb))

                # Pad embedding to collection dimension if needed
                padded_emb = self._pad_embedding(list(emb), self.dimension)
                padded_embeddings.append(padded_emb)

                if metadata and i < len(metadata):
                    metadatas.append(metadata[i])
                else:
                    metadatas.append({})

            # Prepare data with padded embeddings
            data = [
                ids,
                padded_embeddings,
                document_ids,
                chunk_indices,
                contents,
                embedding_models,
                embedding_dims,
                metadatas,
            ]

            # Insert
            insert_result = self.collection.insert(data)

            # Flush to ensure data is persisted
            self.collection.flush()

            logger.info(
                f"Inserted {entity_count} embeddings for document {document_id} "
                f"using {embedding_model} (padded from {model_dim} to {self.dimension})"
            )

            return ids

        except Exception as e:
            logger.error(f"Error inserting embeddings: {e}")
            raise

    def _pad_embedding(self, embedding: List[float], target_dim: int) -> List[float]:
        """
        Pad or truncate embedding to target dimension.

        Args:
            embedding: Original embedding vector
            target_dim: Target dimension

        Returns:
            Padded or truncated embedding
        """
        current_dim = len(embedding)

        if current_dim == target_dim:
            return embedding
        elif current_dim < target_dim:
            # Pad with zeros at the end
            return embedding + [0.0] * (target_dim - current_dim)
        else:
            # Truncate (shouldn't happen, but handle gracefully)
            logger.warning(f"Truncating embedding from {current_dim} to {target_dim}")
            return embedding[:target_dim]

    async def search(
        self,
        query_embedding: List[float],
        embedding_model: Optional[str] = None,
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents.

        Args:
            query_embedding: Query embedding vector
            embedding_model: Filter by embedding model
            top_k: Number of results to return
            filters: Optional filters for search

        Returns:
            List of search results with scores
        """
        try:
            # Pad query embedding if needed
            padded_query = self._pad_embedding(list(query_embedding), self.dimension)

            # Build filter expression
            filter_expr = None

            if embedding_model:
                filter_expr = f'embedding_model == "{embedding_model}"'

            if filters and filters.get("document_id"):
                doc_filter = f'document_id == "{filters["document_id"]}"'
                filter_expr = (
                    f"{filter_expr} and {doc_filter}"
                    if filter_expr
                    else doc_filter
                )

            # Search parameters
            search_params = {
                "metric_type": "COSINE",
                "params": {"ef": 64},
            }

            # Execute search
            results = self.collection.search(
                data=[padded_query],
                anns_field="embedding",
                param=search_params,
                limit=top_k,
                expr=filter_expr,
                output_fields=[
                    "document_id",
                    "chunk_index",
                    "content",
                    "embedding_model",
                    "metadata",
                ],
            )

            # Format results
            formatted_results = []

            for hit in results[0]:
                formatted_results.append({
                    "id": hit.id,
                    "score": hit.score,
                    "document_id": hit.entity.get("document_id"),
                    "chunk_index": hit.entity.get("chunk_index"),
                    "content": hit.entity.get("content"),
                    "embedding_model": hit.entity.get("embedding_model"),
                    "metadata": hit.entity.get("metadata", {}),
                })

            logger.info(
                f"Search returned {len(formatted_results)} results "
                f"(model: {embedding_model})"
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
            # Use expr to find all entities for this document
            expr = f'document_id == "{document_id}"'

            # Get count before deletion
            self.collection.load()
            count = self.collection.num_entities

            # Delete
            self.collection.delete(expr)

            # Flush
            self.collection.flush()

            logger.info(f"Deleted document {document_id} from Milvus")

            return count

        except Exception as e:
            logger.error(f"Error deleting document: {e}")
            raise

    async def get_document_count(self) -> int:
        """Get total number of entities in the collection."""
        try:
            self.collection.load()
            return self.collection.num_entities
        except Exception as e:
            logger.error(f"Error getting document count: {e}")
            return 0

    async def get_stats(self) -> Dict[str, Any]:
        """Get collection statistics."""
        try:
            self.collection.load()

            stats = {
                "name": self.collection_name,
                "count": self.collection.num_entities,
                "dimension": self.dimension,
            }

            return stats

        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {}
