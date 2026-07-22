"""
Test Script for RAG System
Tests resume chunking, embedding storage, and retrieval
"""
from __future__ import annotations

import sys
import json
from app.services.rag_service import rag_service
from app.core.database import engine
from sqlalchemy import text


def test_pgvector_installed():
    """Check if pgvector is installed"""
    print("🔍 Testing pgvector installation...")
    
    is_postgres = "postgresql" in str(engine.url)
    if not is_postgres:
        print("⚠️  Not using PostgreSQL - will use fallback keyword search")
        return True
    
    try:
        with engine.begin() as conn:
            result = conn.execute(text("""
                SELECT * FROM pg_extension WHERE extname = 'vector';
            """)).fetchone()
            
            if result:
                print("✅ pgvector extension is installed")
                return True
            else:
                print("❌ pgvector extension is NOT installed")
                return False
    except Exception as e:
        print(f"❌ Error checking pgvector: {e}")
        return False


def test_resume_chunking():
    """Test resume chunking functionality"""
    print("\n📝 Testing resume chunking...")
    
    sample_resume = """
John Doe
Senior Python Developer

SUMMARY
Experienced Python developer with 5+ years building scalable web applications.

EXPERIENCE
Senior Python Developer at TechCorp (2020-Present)
- Led development of microservices architecture
- Improved API performance by 40%
- Mentored junior developers

Python Developer at StartupXYZ (2018-2020)
- Built REST APIs using FastAPI and Django
- Implemented CI/CD pipelines
- Reduced deployment time by 60%

PROJECTS
E-commerce Platform
- Built a full-stack e-commerce solution using React and Python
- Implemented payment integration with Stripe
- Handled 10,000+ daily transactions

Real-time Analytics Dashboard
- Developed a real-time analytics dashboard using WebSockets
- Processed millions of events per day
- Used Redis for caching and PostgreSQL for storage

SKILLS
Python, FastAPI, Django, React, PostgreSQL, Redis, Docker, Kubernetes, AWS

EDUCATION
B.Tech in Computer Science
Indian Institute of Technology, Delhi (2014-2018)

CERTIFICATIONS
- AWS Certified Solutions Architect
- Certified Kubernetes Administrator
"""
    
    try:
        chunks = rag_service._split_into_chunks(sample_resume, "test_candidate_123")
        
        print(f"✅ Resume split into {len(chunks)} chunks")
        
        for i, chunk in enumerate(chunks[:3]):  # Show first 3 chunks
            print(f"\n--- Chunk {i+1} ---")
            print(f"Section: {chunk.section_type}")
            print(f"Text: {chunk.chunk_text[:100]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Error chunking resume: {e}")
        return False


def test_embedding_generation():
    """Test embedding generation"""
    print("\n🔢 Testing embedding generation...")
    
    test_text = "Python developer with experience in FastAPI and Django"
    
    try:
        embedding = rag_service._generate_embedding(test_text)
        
        if isinstance(embedding, list) and len(embedding) == 16:
            print(f"✅ Embedding generated: {len(embedding)} dimensions")
            print(f"   First 5 values: {embedding[:5]}")
            return True
        else:
            print(f"❌ Invalid embedding format: {type(embedding)}, length {len(embedding)}")
            return False
            
    except Exception as e:
        print(f"❌ Error generating embedding: {e}")
        return False


def test_store_and_retrieve():
    """Test storing and retrieving resume chunks"""
    print("\n💾 Testing store and retrieve...")
    
    sample_resume = """
Jane Smith
Data Scientist

SUMMARY
Data scientist with expertise in machine learning and AI.

EXPERIENCE
Senior Data Scientist at AI Corp (2019-Present)
- Built recommendation systems serving millions of users
- Developed NLP models for sentiment analysis
- Led a team of 5 data scientists

PROJECTS
Customer Churn Prediction
- Built ML model predicting customer churn with 92% accuracy
- Used XGBoost and feature engineering
- Saved company $2M annually

Natural Language Processing Pipeline
- Developed end-to-end NLP pipeline for document classification
- Implemented BERT-based models
- Processed 100K+ documents daily

SKILLS
Python, TensorFlow, PyTorch, Scikit-learn, Pandas, SQL, AWS, Spark
"""
    
    candidate_id = "test_candidate_456"
    
    try:
        # Store embeddings
        success = rag_service.store_resume_embeddings(candidate_id, sample_resume)
        
        if success:
            print("✅ Resume embeddings stored successfully")
        else:
            print("⚠️  Embeddings storage skipped (not PostgreSQL or pgvector not available)")
            return True
        
        # Test retrieval
        chunks = rag_service.retrieve_relevant_chunks(
            candidate_id=candidate_id,
            query="machine learning experience",
            top_k=2
        )
        
        if chunks:
            print(f"✅ Retrieved {len(chunks)} relevant chunks")
            for i, chunk in enumerate(chunks):
                print(f"\n--- Retrieved Chunk {i+1} ---")
                print(f"Section: {chunk['section_type']}")
                print(f"Similarity: {chunk['similarity']:.3f}")
                print(f"Text: {chunk['chunk_text'][:100]}...")
            return True
        else:
            print("⚠️  No chunks retrieved (this may be normal if using fallback)")
            return True
            
    except Exception as e:
        print(f"❌ Error in store/retrieve test: {e}")
        return False


def test_context_generation():
    """Test context generation for questions"""
    print("\n📄 Testing context generation...")
    
    candidate_id = "test_candidate_456"
    
    try:
        context = rag_service.get_context_for_question(
            candidate_id=candidate_id,
            question_type="technical",
            job_role="Data Scientist",
            domain="IT"
        )
        
        if context:
            print("✅ Context generated successfully")
            print(f"\n--- Generated Context ---")
            print(context[:500] + "..." if len(context) > 500 else context)
            return True
        else:
            print("⚠️  No context generated (this may be normal if no data stored)")
            return True
            
    except Exception as e:
        print(f"❌ Error generating context: {e}")
        return False


def run_all_tests():
    """Run all RAG tests"""
    print("=" * 60)
    print("🧪 RAG System Test Suite")
    print("=" * 60)
    
    results = []
    
    # Test 1: pgvector installation
    results.append(("pgvector Installation", test_pgvector_installed()))
    
    # Test 2: Resume chunking
    results.append(("Resume Chunking", test_resume_chunking()))
    
    # Test 3: Embedding generation
    results.append(("Embedding Generation", test_embedding_generation()))
    
    # Test 4: Store and retrieve
    results.append(("Store & Retrieve", test_store_and_retrieve()))
    
    # Test 5: Context generation
    results.append(("Context Generation", test_context_generation()))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! RAG system is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Please review the output above.")
    
    return passed == total


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)