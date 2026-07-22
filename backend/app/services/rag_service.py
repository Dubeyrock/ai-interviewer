"""
RAG Service for Resume-Based Question Generation
Uses PostgreSQL pgvector for semantic search on resume chunks
"""
from __future__ import annotations

import re
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import json

from app.core.database import SessionLocal, engine
from app.core.config import settings
from sqlalchemy import text


@dataclass
class ResumeChunk:
    """Represents a chunk of resume text with metadata"""
    chunk_id: str
    candidate_id: str
    section_type: str  # experience, project, education, skills, certification, summary
    chunk_text: str
    chunk_order: int
    embedding: Optional[List[float]] = None


class RAGService:
    def __init__(self):
        self.embedding_model = settings.groq_model  # We'll use Groq for embeddings
        self.chunk_size = 300  # characters per chunk
        self.chunk_overlap = 50  # overlap between chunks

    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using Groq API"""
        try:
            from app.services.groq_service import groq_service
            
            if not groq_service.available():
                # Fallback to simple hash-based embedding
                return self._simple_embedding(text)
            
            # Use Groq's embedding capability through chat completion
            prompt = f"""Convert this text into a numerical embedding vector (array of 16 floats between -1 and 1). 
Return ONLY the array in JSON format, nothing else.

Text: {text[:500]}"""
            
            response = groq_service.chat(
                [
                    {"role": "system", "content": "You are an embedding generator. Return ONLY a JSON array of 16 floats."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                json_mode=True
            )
            
            # Parse the response
            try:
                embedding = json.loads(response)
                if isinstance(embedding, list) and len(embedding) == 16:
                    return [float(x) for x in embedding]
            except:
                pass
                
            return self._simple_embedding(text)
            
        except Exception as e:
            print(f"Embedding generation error: {e}")
            return self._simple_embedding(text)

    def _simple_embedding(self, text: str) -> List[float]:
        """Simple hash-based embedding as fallback (16 dimensions)"""
        words = text.lower().split()
        embedding = [0.0] * 16
        
        for i, word in enumerate(words[:50]):  # Limit words for performance
            word_hash = hash(word)
            for j in range(16):
                embedding[j] += ((word_hash >> j) & 1) * 2 - 1
        
        norm = sum(x**2 for x in embedding) ** 0.5
        if norm > 0:
            embedding = [x / norm for x in embedding]
            
        return embedding

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
                            chunk_order=chunk_order,
                            embedding=None
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
                        chunk_order=chunk_order,
                        embedding=None
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
        """Store resume chunks with embeddings in PostgreSQL or fallback storage"""
        try:
            chunks = self._split_into_chunks(resume_text, candidate_id)
            
            for chunk in chunks:
                chunk.embedding = self._generate_embedding(chunk.chunk_text)
            
            db = SessionLocal()
            try:
                db.execute(text("""
                    DELETE FROM resume_chunks WHERE candidate_id = :candidate_id
                """), {"candidate_id": candidate_id})
                
                is_postgres = "postgresql" in str(engine.url)
                
                if is_postgres:
                    try:
                        for chunk in chunks:
                            embedding_str = json.dumps(chunk.embedding)
                            db.execute(text("""
                                INSERT INTO resume_chunks 
                                (chunk_id, candidate_id, section_type, chunk_text, chunk_order, embedding)
                                VALUES (:chunk_id, :candidate_id, :section_type, :chunk_text, :chunk_order, :embedding::vector)
                            """), {
                                "chunk_id": chunk.chunk_id,
                                "candidate_id": candidate_id,
                                "section_type": chunk.section_type,
                                "chunk_text": chunk.chunk_text,
                                "chunk_order": chunk.chunk_order,
                                "embedding": embedding_str
                            })
                        db.commit()
                        return True
                    except Exception as e:
                        print(f"pgvector storage failed, using text-only fallback: {e}")
                        db.rollback()
                
                for chunk in chunks:
                    embedding_str = json.dumps(chunk.embedding)
                    db.execute(text("""
                        INSERT INTO resume_chunks 
                        (chunk_id, candidate_id, section_type, chunk_text, chunk_order, embedding)
                        VALUES (:chunk_id, :candidate_id, :section_type, :chunk_text, :chunk_order, :embedding)
                    """), {
                        "chunk_id": chunk.chunk_id,
                        "candidate_id": candidate_id,
                        "section_type": chunk.section_type,
                        "chunk_text": chunk.chunk_text,
                        "chunk_order": chunk.chunk_order,
                        "embedding": embedding_str
                    })
                
                db.commit()
                return True
                
            except Exception as e:
                db.rollback()
                print(f"Error storing embeddings: {e}")
                return False
            finally:
                db.close()
                
        except Exception as e:
            print(f"RAG storage error: {e}")
            return False

    def retrieve_relevant_chunks(
        self, 
        candidate_id: str, 
        query: str, 
        top_k: int = 3,
        section_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Retrieve most relevant resume chunks for a query"""
        
        try:
            is_postgres = "postgresql" in str(engine.url)
            
            if not is_postgres:
                return self._keyword_search(candidate_id, query, top_k, section_filter)
            
            query_embedding = self._generate_embedding(query)
            embedding_str = json.dumps(query_embedding)
            
            db = SessionLocal()
            try:
                if section_filter:
                    sql = """
                        SELECT chunk_id, candidate_id, section_type, chunk_text, chunk_order,
                               1 - (embedding <=> :embedding::vector) as similarity
                        FROM resume_chunks
                        WHERE candidate_id = :candidate_id 
                          AND section_type = :section_type
                        ORDER BY embedding <=> :embedding::vector
                        LIMIT :limit
                    """
                    params = {
                        "embedding": embedding_str,
                        "candidate_id": candidate_id,
                        "section_type": section_filter,
                        "limit": top_k
                    }
                else:
                    sql = """
                        SELECT chunk_id, candidate_id, section_type, chunk_text, chunk_order,
                               1 - (embedding <=> :embedding::vector) as similarity
                        FROM resume_chunks
                        WHERE candidate_id = :candidate_id
                        ORDER BY embedding <=> :embedding::vector
                        LIMIT :limit
                    """
                    params = {
                        "embedding": embedding_str,
                        "candidate_id": candidate_id,
                        "limit": top_k
                    }
                
                result = db.execute(text(sql), params).fetchall()
                
                return [
                    {
                        "chunk_id": row.chunk_id,
                        "candidate_id": row.candidate_id,
                        "section_type": row.section_type,
                        "chunk_text": row.chunk_text,
                        "chunk_order": row.chunk_order,
                        "similarity": float(row.similarity) if row.similarity else 0.0
                    }
                    for row in result
                ]
                
            except Exception as e:
                print(f"RAG retrieval error: {e}")
                return self._keyword_search(candidate_id, query, top_k, section_filter)
            finally:
                db.close()
        except Exception as e:
            print(f"RAG retrieval outer error: {e}")
            return self._keyword_search(candidate_id, query, top_k, section_filter)
    
    def _simple_similarity(self, text1: str, text2: str) -> float:
        """Calculate simple Jaccard similarity between two texts"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1 & words2)
        union = len(words1 | words2)
        
        return intersection / union if union > 0 else 0.0

    def _keyword_search(
        self, 
        candidate_id: str, 
        query: str, 
        top_k: int = 3,
        section_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fallback keyword-based search when pgvector is not available"""
        try:
            db = SessionLocal()
            try:
                conditions = ["candidate_id = :candidate_id"]
                params = {"candidate_id": candidate_id}
                
                if section_filter:
                    conditions.append("section_type = :section_type")
                    params["section_type"] = section_filter
                
                where_clause = " AND ".join(conditions)
                sql = f"""
                    SELECT chunk_id, candidate_id, section_type, chunk_text, chunk_order, embedding
                    FROM resume_chunks
                    WHERE {where_clause}
                """
                
                result = db.execute(text(sql), params).fetchall()
                
                chunks_with_similarity = []
                for row in result:
                    chunk_text = row.chunk_text
                    similarity = self._simple_similarity(query, chunk_text)
                    chunks_with_similarity.append({
                        "chunk_id": row.chunk_id,
                        "candidate_id": row.candidate_id,
                        "section_type": row.section_type,
                        "chunk_text": chunk_text,
                        "chunk_order": row.chunk_order,
                        "similarity": similarity
                    })
                
                chunks_with_similarity.sort(key=lambda x: x["similarity"], reverse=True)
                return chunks_with_similarity[:top_k]
                
            finally:
                db.close()
                
        except Exception as e:
            print(f"Keyword search error: {e}")
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


# Singleton instance
rag_service = RAGService()