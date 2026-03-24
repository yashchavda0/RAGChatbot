"""
Text splitter service for chunking documents for embedding and search.
Uses LangChain's RecursiveCharacterTextSplitter approach.
"""
import re
from typing import List, Dict, Any, Optional
from config import settings
from config.logging_config import get_logger

logger = get_logger(__name__)


class TextSplitterService:
    """Service for splitting text into chunks for embedding."""

    def __init__(self):
        """Initialize the text splitter service."""
        self.chunk_size = settings.chunk_size
        self.chunk_overlap = settings.chunk_overlap

        logger.info(
            f"Text splitter initialized (size: {self.chunk_size}, "
            f"overlap: {self.chunk_overlap})"
        )

    def split_text(
        self,
        text: str,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ) -> List[str]:
        """
        Split text into chunks.

        Args:
            text: Text to split
            chunk_size: Target chunk size (characters)
            chunk_overlap: Overlap between chunks

        Returns:
            List of text chunks
        """
        chunk_size = chunk_size or self.chunk_size
        chunk_overlap = chunk_overlap or self.chunk_overlap

        if not text or len(text) <= chunk_size:
            return [text] if text else []

        chunks = []
        start = 0

        while start < len(text):
            end = start + chunk_size

            # If this is the last chunk, take whatever is left
            if end >= len(text):
                chunk = text[start:]
                if chunk.strip():
                    chunks.append(chunk.strip())
                break

            # Try to find a good break point
            chunk = text[start:end]

            # Look for sentence boundaries first
            sentence_end = self._find_sentence_end(chunk)

            if sentence_end > 0 and sentence_end > chunk_size * 0.5:
                # Use sentence boundary
                chunk = text[start:start + sentence_end]
                start += sentence_end
            else:
                # Look for paragraph break
                para_break = chunk.rfind('\n\n')
                if para_break > chunk_size * 0.5:
                    chunk = text[start:start + para_break]
                    start += para_break + 2
                else:
                    # Look for word boundary
                    word_break = chunk.rfind(' ')
                    if word_break > chunk_size * 0.5:
                        chunk = text[start:start + word_break]
                        start += word_break + 1
                    else:
                        # Just split at chunk_size
                        start = end

            if chunk.strip():
                chunks.append(chunk.strip())

        return chunks

    def _find_sentence_end(self, text: str) -> int:
        """Find the last sentence ending position in text."""
        # Look for sentence endings: . ! ? followed by space or newline
        patterns = [
            re.compile(r'[.!?]\s+\n'),  # Sentence end with newline
            re.compile(r'[.!?]\s+[A-Z]'),  # Sentence end before capital
            re.compile(r'[.!?]\s+$'),  # Sentence end at end
        ]

        best_match = 0

        for pattern in patterns:
            matches = list(pattern.finditer(text))
            if matches:
                match = matches[-1]
                pos = match.end()
                if pos > best_match:
                    best_match = pos

        return best_match

    def split_documents(
        self,
        documents: List[Dict[str, Any]],
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """
        Split multiple documents into chunks with metadata.

        Args:
            documents: List of documents with 'text' field
            chunk_size: Target chunk size
            chunk_overlap: Overlap between chunks

        Returns:
            List of chunks with metadata
        """
        all_chunks = []

        for doc in documents:
            text = doc.get("text", "")
            doc_metadata = doc.get("metadata", {})

            chunks = self.split_text(text, chunk_size, chunk_overlap)

            for i, chunk in enumerate(chunks):
                all_chunks.append({
                    "content": chunk,
                    "chunk_index": i,
                    "metadata": {
                        **doc_metadata,
                        "chunk_index": i,
                        "chunk_count": len(chunks),
                    },
                })

        logger.info(f"Split {len(documents)} documents into {len(all_chunks)} chunks")

        return all_chunks

    def split_with_context(
        self,
        text: str,
        context_chunks: int = 1,
    ) -> List[Dict[str, Any]]:
        """
        Split text and include context from adjacent chunks.

        Args:
            text: Text to split
            context_chunks: Number of adjacent chunks to include

        Returns:
            List of chunks with context
        """
        chunks = self.split_text(text)

        if context_chunks <= 0:
            return [{"content": c, "context": c} for c in chunks]

        enriched_chunks = []

        for i, chunk in enumerate(chunks):
            # Gather context from adjacent chunks
            context_parts = []

            # Previous chunks
            for j in range(max(0, i - context_chunks), i):
                context_parts.append(chunks[j][-200:])  # Last 200 chars

            # Current chunk
            context_parts.append(chunk)

            # Next chunks
            for j in range(i + 1, min(len(chunks), i + context_chunks + 1)):
                context_parts.append(chunks[j][:200])  # First 200 chars

            context = "\n...\n".join(context_parts)

            enriched_chunks.append({
                "content": chunk,
                "context": context,
                "chunk_index": i,
            })

        return enriched_chunks
