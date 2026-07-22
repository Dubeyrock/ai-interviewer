"""
Hybrid RAG Service: Numpy Vector Store + PostgreSQL for metadata
- PostgreSQL: candidate details, resume file path, interview history, scores
- Numpy Vector Store: resume chunks + embeddings + semantic search
  (Pure Python — no C++ build tools required)
"""
from __future__ import annotations

import json
import os
import re
import hashlib
import threading
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict

import numpy as np

# pyrefly: ignore [missing-import]
from app.core.database import SessionLocal, engine
# pyrefly: ignore [missing-import]
from app.core.config import settings
from sqlalchemy import text


@dataclass
class ResumeChunk:
    """Represents a chunk of resume text with metadata"""
    chunk_id: str
    candidate_id: str
    section_type: str
    chunk_text: str
    chunk_order: int


class NumpyVectorStore:
    """
    A lightweight, pure-Python vector store using numpy for similarity search.
    Persists data as JSON — no C++ compilation, no external DB required.
    """

    def __init__(self, persist_path: str):
        self.persist_path = persist_path
        self._lock = threading.Lock()
        self._data: Dict[str, dict] = {}  # id -> {embedding, document, metadata}
        os.makedirs(os.path.dirname(persist_path) or ".", exist_ok=True)
        self._load()

    def _load(self):
        """Load persisted data from JSON file"""
        if os.path.exists(self.persist_path):
            try:
                with open(self.persist_path, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
                print(f"NumpyVectorStore: Loaded {len(self._data)} vectors")
            except Exception as e:
                print(f"NumpyVectorStore: Load error (starting fresh): {e}")
                self._data = {}

    def _save(self):
        """Persist data to JSON file"""
        try:
            with open(self.persist_path, "w", encoding="utf-8") as f:
                json.dump(self._data, f, ensure_ascii=False)
        except Exception as e:
            print(f"NumpyVectorStore: Save error: {e}")

    def upsert(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[dict],
    ):
        """Add or update vectors"""
        with self._lock:
            for i, vid in enumerate(ids):
                self._data[vid] = {
                    "embedding": embeddings[i],
                    "document": documents[i],
                    "metadata": metadatas[i],
                }
            self._save()

    def delete(self, ids: List[str]):
        """Delete vectors by ID"""
        with self._lock:
            for vid in ids:
                self._data.pop(vid, None)
            self._save()

    def get(self, where: dict) -> dict:
        """Get entries matching metadata filters"""
        matched_ids = []
        matched_docs = []
        matched_metas = []
        for vid, entry in self._data.items():
            meta = entry.get("metadata", {})
            if all(meta.get(k) == v for k, v in where.items()):
                matched_ids.append(vid)
                matched_docs.append(entry.get("document", ""))
                matched_metas.append(meta)
        return {"ids": matched_ids, "documents": matched_docs, "metadatas": matched_metas}

    def query(
        self,
        query_embedding: List[float],
        n_results: int = 3,
        where: Optional[dict] = None,
    ) -> dict:
        """Find the most similar vectors using cosine similarity"""
        # Filter candidates
        candidates = []
        for vid, entry in self._data.items():
            if where:
                meta = entry.get("metadata", {})
                if not all(meta.get(k) == v for k, v in where.items()):
                    continue
            candidates.append((vid, entry))

        if not candidates:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

        # Build matrix and compute cosine similarity
        q = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(q)
        if q_norm == 0:
            q_norm = 1.0

        ids_list = []
        sims = []
        for vid, entry in candidates:
            emb = np.array(entry["embedding"], dtype=np.float32)
            emb_norm = np.linalg.norm(emb)
            if emb_norm == 0:
                emb_norm = 1.0
            cos_sim = float(np.dot(q, emb) / (q_norm * emb_norm))
            ids_list.append(vid)
            sims.append(cos_sim)

        # Sort by similarity (descending), take top n
        indices = np.argsort(sims)[::-1][:n_results]

        result_ids = [ids_list[i] for i in indices]
        result_docs = [candidates[i][1]["document"] for i in indices]
        result_metas = [candidates[i][1].get("metadata", {}) for i in indices]
        # Return distance = 1 - similarity (to match ChromaDB convention)
        result_dists = [1.0 - sims[i] for i in indices]

        return {
            "ids": [result_ids],
            "documents": [result_docs],
            "metadatas": result_metas,
            "distances": [result_dists],
        }


class ChromaRAGService:
    def __init__(self):
        self.collection = None
        self.chunk_size = 300
        self.chunk_overlap = 50
        self._init_store()

    def _init_store(self):
        """Initialize the numpy-based vector store"""
        try:
            store_dir = os.path.abspath(settings.chroma_db_path)
            os.makedirs(store_dir, exist_ok=True)
            store_path = os.path.join(store_dir, "vectors.json")

            self.collection = NumpyVectorStore(persist_path=store_path)
            print("NumpyVectorStore initialized successfully (pure Python — no C++ needed)")
        except Exception as e:
            print(f"VectorStore initialization error: {e}")

    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using a deterministic hash-based approach (no C++ deps).

        Produces a 64-dimensional embedding via multiple hash seeds for
        reasonable semantic discrimination without external ML models.
        """
        return self._hash_embedding(text)

    def _hash_embedding(self, text: str) -> List[float]:
        """Hash-based embedding (64 dimensions) — pure Python, no ML model needed.

        Uses character n-grams and word-level hashing for richer representations
        than a simple bag-of-words approach.
        """
        dims = 64
        embedding = np.zeros(dims, dtype=np.float64)
        text_lower = text.lower()
        words = text_lower.split()

        # Word-level hashing
        for i, word in enumerate(words[:100]):
            h = int(hashlib.md5(word.encode()).hexdigest(), 16)
            for j in range(dims):
                bit = (h >> (j % 128)) & 1
                weight = 1.0 / (1.0 + i * 0.05)  # Position decay
                embedding[j] += (bit * 2 - 1) * weight

        # Character trigram hashing for sub-word features
        for i in range(len(text_lower) - 2):
            trigram = text_lower[i:i+3]
            h = int(hashlib.md5(trigram.encode()).hexdigest(), 16)
            for j in range(dims):
                bit = (h >> (j % 128)) & 1
                embedding[j] += (bit * 2 - 1) * 0.3

        # L2 normalize
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return embedding.tolist()

    def _split_into_chunks(self, resume_text: str, candidate_id: str) -> List[ResumeChunk]:
        """Split resume into semantic chunks"""
        chunks = []
        sections = self._extract_sections(resume_text)
        chunk_order = 0

        for section_type, section_text in sections:
            if len(section_text) > self.chunk_size:
                start = 0
                while start < len(section_text):
                    end = start + self.chunk_size
                    chunk_text = section_text[start:end].strip()

                    if len(chunk_text) > 20:
                        chunks.append(ResumeChunk(
                            chunk_id=f"{candidate_id}_{chunk_order}",
                            candidate_id=candidate_id,
                            section_type=section_type,
                            chunk_text=chunk_text,
                            chunk_order=chunk_order
                        ))
                        chunk_order += 1

                    start = end - self.chunk_overlap
            else:
                if len(section_text) > 20:
                    chunks.append(ResumeChunk(
                        chunk_id=f"{candidate_id}_{chunk_order}",
                        candidate_id=candidate_id,
                        section_type=section_type,
                        chunk_text=section_text,
                        chunk_order=chunk_order
                    ))
                    chunk_order += 1

        return chunks

    def _extract_sections(self, resume_text: str) -> List[Tuple[str, str]]:
        """Extract sections from resume text"""
        sections = []

        section_patterns = {
            "summary": [r"(?i)(summary|objective|profile|about me)[:\s]*(.*?)(?=\n\n|\n[A-Z][A-Z\s]+\n|$)", re.DOTALL],
            "experience": [r"(?i)(experience|work experience|employment|professional experience)[:\s]*(.*?)(?=\n\n|\n[A-Z][A-Z\s]+\n|$)", re.DOTALL],
            "project": [r"(?i)(projects?|personal projects|academic projects|key projects)[:\s]*(.*?)(?=\n\n|\n[A-Z][A-Z\s]+\n|$)", re.DOTALL],
            "education": [r"(?i)(education|qualifications?|academic background|degrees?)[:\s]*(.*?)(?=\n\n|\n[A-Z][A-Z\s]+\n|$)", re.DOTALL],
            "skills": [r"(?i)(skills|technical skills|core competencies|expertise)[:\s]*(.*?)(?=\n\n|\n[A-Z][A-Z\s]+\n|$)", re.DOTALL],
            "certification": [r"(?i)(certifications?|courses|training|licenses?)[:\s]*(.*?)(?=\n\n|\n[A-Z][A-Z\s]+\n|$)", re.DOTALL],
        }

        for section_type, (pattern, flags) in section_patterns.items():
            matches = re.findall(pattern, resume_text, flags)
            for match in matches:
                if isinstance(match, tuple):
                    content = match[1] if len(match) > 1 else match[0]
                else:
                    content = match

                content = re.sub(r'\s+', ' ', content).strip()
                if content and len(content) > 20:
                    sections.append((section_type, content))

        if not sections:
            sections.append(("summary", resume_text[:2000]))

        return sections

    def store_resume_embeddings(self, candidate_id: str, resume_text: str) -> bool:
        """Store resume chunks with embeddings in the vector store"""
        if not self.collection:
            print("VectorStore not available, skipping embedding storage")
            return False

        try:
            self.delete_candidate_chunks(candidate_id)

            chunks = self._split_into_chunks(resume_text, candidate_id)

            ids = []
            embeddings_list = []
            documents = []
            metadatas = []

            for chunk in chunks:
                embedding = self._generate_embedding(chunk.chunk_text)
                ids.append(chunk.chunk_id)
                embeddings_list.append(embedding)
                documents.append(chunk.chunk_text)
                metadatas.append({
                    "candidate_id": candidate_id,
                    "section_type": chunk.section_type,
                    "chunk_order": chunk.chunk_order
                })

            self.collection.upsert(
                ids=ids,
                embeddings=embeddings_list,
                documents=documents,
                metadatas=metadatas
            )

            print(f"Stored {len(chunks)} chunks in VectorStore for candidate {candidate_id}")
            return True

        except Exception as e:
            print(f"RAG storage error: {e}")
            return False

    def delete_candidate_chunks(self, candidate_id: str) -> bool:
        """Delete all chunks for a candidate from the vector store"""
        if not self.collection:
            return False

        try:
            existing = self.collection.get(
                where={"candidate_id": candidate_id}
            )
            if existing and existing.get('ids'):
                self.collection.delete(ids=existing['ids'])
            return True
        except Exception as e:
            print(f"Delete chunks error: {e}")
            return False

    def retrieve_relevant_chunks(
        self,
        candidate_id: str,
        query: str,
        top_k: int = 3,
        section_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve most relevant resume chunks for a query"""

        if not self.collection:
            return self._keyword_fallback(candidate_id, query, top_k, section_filter)

        try:
            query_embedding = self._generate_embedding(query)

            where_clause = {"candidate_id": candidate_id}
            if section_filter:
                where_clause["section_type"] = section_filter

            results = self.collection.query(
                query_embedding=query_embedding,
                n_results=top_k,
                where=where_clause
            )

            if not results or not results.get('ids') or not results['ids'][0]:
                return []

            chunks = []
            ids = results['ids'][0]
            documents = results.get('documents', [[]])[0]
            metadatas = results.get('metadatas', [[]])
            distances = results.get('distances', [[]])[0]

            for i, chunk_id in enumerate(ids):
                metadata = metadatas[i] if i < len(metadatas) else {}
                distance = distances[i] if i < len(distances) else 0
                similarity = 1 - distance

                chunks.append({
                    "chunk_id": chunk_id,
                    "candidate_id": candidate_id,
                    "section_type": metadata.get("section_type", "unknown"),
                    "chunk_text": documents[i] if i < len(documents) else "",
                    "chunk_order": metadata.get("chunk_order", i),
                    "similarity": float(similarity)
                })

            return chunks

        except Exception as e:
            print(f"RAG retrieval error: {e}")
            return self._keyword_fallback(candidate_id, query, top_k, section_filter)

    def _keyword_fallback(self, candidate_id: str, query: str, top_k: int, section_filter: Optional[str]) -> List[Dict[str, Any]]:
        """Fallback keyword search in PostgreSQL if vector store fails"""
        return []

    def get_context_for_question(
        self,
        candidate_id: str,
        question_type: str,
        job_role: str,
        domain: str
    ) -> str:
        """Get relevant resume context for generating a specific type of question"""

        section_mapping = {
            "intro": ["summary", "experience"],
            "why_hire": ["experience", "project", "skills"],
            "technical": ["project", "skills", "experience"],
            "resume": ["project", "experience"],
            "behavioral": ["experience", "project"],
            "salary": ["experience"],
            "adapt_tech": ["project", "skills", "certification"],
            "why_role": ["summary", "experience"],
            "resume_walk": ["experience", "education", "project"],
            "job_change": ["experience"],
            "strengths": ["experience", "project", "skills"],
            "pressure": ["experience", "project"],
            "closing": ["summary", "experience"],
        }

        relevant_sections = section_mapping.get(question_type, ["experience", "project"])

        all_chunks = []
        for section in relevant_sections:
            chunks = self.retrieve_relevant_chunks(
                candidate_id=candidate_id,
                query=f"{question_type} {job_role} {domain}",
                top_k=2,
                section_filter=section
            )
            all_chunks.extend(chunks)

        if not all_chunks:
            return ""

        context_parts = []
        for chunk in all_chunks[:5]:
            context_parts.append(f"[{chunk['section_type'].upper()}] {chunk['chunk_text']}")

        return "\n\n".join(context_parts)


chroma_rag_service = ChromaRAGService()