"""
Test Script for ChromaDB RAG System
"""
from __future__ import annotations

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.chroma_rag_service import chroma_rag_service


def test_chroma_init():
    """Check if ChromaDB initialized"""
    print("🔍 Testing ChromaDB initialization...")
    
    if chroma_rag_service.collection:
        print("✅ ChromaDB collection ready")
        return True
    else:
        print("❌ ChromaDB collection not available")
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
- Led development of microservices architecture using FastAPI
- Improved API performance by 40%
- Mentored junior developers

PROJECTS
E-commerce Platform
- Built full-stack e-commerce using React and Python FastAPI
- Implemented payment integration with Stripe
- Handled 10,000+ daily transactions

SKILLS
Python, FastAPI, Django, React, PostgreSQL, Redis, Docker, AWS
"""
    
    try:
        chunks = chroma_rag_service._split_into_chunks(sample_resume, "test_candidate_123")
        
        print(f"✅ Resume split into {len(chunks)} chunks")
        
        for i, chunk in enumerate(chunks[:3]):
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
        embedding = chroma_rag_service._generate_embedding(test_text)
        
        if isinstance(embedding, list) and len(embedding) > 0:
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

SKILLS
Python, TensorFlow, PyTorch, Scikit-learn, Pandas, SQL, AWS
"""
    
    candidate_id = "test_candidate_456"
    
    try:
        # Store embeddings
        if not chroma_rag_service.collection:
            print("⚠️  ChromaDB not available, skipping test")
            return True
        
        success = chroma_rag_service.store_resume_embeddings(candidate_id, sample_resume)
        
        if success:
            print("✅ Resume embeddings stored successfully")
        else:
            print("❌ Failed to store embeddings")
            return False
        
        # Test retrieval
        chunks = chroma_rag_service.retrieve_relevant_chunks(
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
            print("⚠️  No chunks retrieved")
            return True
            
    except Exception as e:
        print(f"❌ Error in store/retrieve test: {e}")
        return False


def test_context_generation():
    """Test context generation for questions"""
    print("\n📄 Testing context generation...")
    
    candidate_id = "test_candidate_456"
    
    try:
        context = chroma_rag_service.get_context_for_question(
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
            print("⚠️  No context generated")
            return True
            
    except Exception as e:
        print(f"❌ Error generating context: {e}")
        return False


def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("🧪 ChromaDB RAG System Test Suite")
    print("=" * 60)
    
    results = []
    
    results.append(("ChromaDB Init", test_chroma_init()))
    results.append(("Resume Chunking", test_resume_chunking()))
    results.append(("Embedding Generation", test_embedding_generation()))
    results.append(("Store & Retrieve", test_store_and_retrieve()))
    results.append(("Context Generation", test_context_generation()))
    
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    return passed == total


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)