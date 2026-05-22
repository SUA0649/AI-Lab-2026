import os
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import traceback as tb
import json
from supabase import create_client, Client


load_dotenv()


url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SERVICE_ROLE_KEY')

# Initialize Supabase client safely
if not url or not key:
    print("WARNING: SUPABASE_URL or SERVICE_ROLE_KEY not set in environment variables")
    supabase = None
else:
    try:
        supabase: Client = create_client(url, key)
    except Exception as e:
        print(f"ERROR: Failed to initialize Supabase client: {e}")
        supabase = None

# Load Embedding model
def load_embedding_model() -> HuggingFaceEmbeddings:
    model_name = "sentence-transformers/all-MiniLM-L6-v2" #"sentence-transformers/all-mpnet-base-v2"  
    try:
        print(f"Loading embedding model: {model_name}...")
        model = HuggingFaceEmbeddings(
            model_name= model_name, # Popular choices: "all-MiniLM-L6-v2" (fast) or "all-mpnet-base-v2" (more accurate)
            model_kwargs={'device': 'cpu'} # Use 'cuda' for GPU
        )
        
        print(f"Successfully loaded embedding model.")
        return model
    
    except Exception as e:
        tb.print_exc()
        print(f"Error loading embedding model {model_name}: {e}")
        return None


# Fetch all existing embedding records from Supabase and populate ALL_DOCUMENTS and ALL_EMBEDDINGS lists
def get_embeddings() -> tuple[list[str], list[list[float]]]: 
    try:
        if not supabase:
            raise Exception("Supabase client not initialized. Check environment variables.")
        
        docs, embeddings = [], []
        print("Fetching embeddings from Supabase...")
        records = supabase.rpc("get_embeddings").execute().data
        
        if not records: 
            print("No embedding records found in Supabase.")
            return [], []
        
        print(f"Found {len(records)} embedding records.")
        for embedding_record in records:
            embeddings.append(json.loads(embedding_record['embedding']))
            docs.append(embedding_record['natural_language'])
            
        return docs, embeddings
    
    except Exception as e:
        tb.print_exc()
        print(f'Error fetching embeddings: {str(e)}')
        return [], []


# Create list of (document, score) tuples and sort by score descending
def retrieve_relevant_docs(query: str, limit: int = 5, threshold: float = 0.55) -> list[tuple[str, float]]:
    try:
        embedding_model = load_embedding_model()
        
        if embedding_model is None:
            raise Exception("Failed to load embedding model.")
        
        documents, document_embeddings = get_embeddings()
        
        if not documents:
            print("No documents available to retrieve from.")
            return []
        
        print(f"Generating embedding for query: '{query}'")
        query_embedding = embedding_model.embed_query(query)
        
        print(f"Ranking {len(documents)} documents by similarity...")
        ranked_docs = [(documents[i], score) 
                       for i, score in enumerate(
                           cosine_similarity(
                                np.array([query_embedding], dtype=np.float32), 
                                np.array(document_embeddings, dtype=np.float32)
                            )[0]) 
                        if score >= threshold
                      ]
        
        ranked_docs.sort(key=lambda x: x[1], reverse=True)
        
        print(f"Found {len(ranked_docs)} relevant documents (threshold: {threshold})")
        return ranked_docs[:limit]

    except Exception as e:
        tb.print_exc()
        print(f'Error retrieving relevant docs: {str(e)}')
        return []

if __name__ == "__main__":
    print(retrieve_relevant_docs(query="Transaction of Laptops"))
