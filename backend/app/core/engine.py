import os
from google import genai
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings

class RAGEngine:
    def __init__(self):
        self.client = None
        self.vector_store = None
        self.is_initialized = False

    def initialize(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("WARNING: GEMINI_API_KEY environment variable not set.")
            return

        self.client = genai.Client(api_key=api_key)
        
        # Initialize Vector DB
        db_path = os.path.join(os.path.dirname(__file__), "../../../faiss_index")
        
        try:
            embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
            if os.path.exists(db_path):
                 self.vector_store = FAISS.load_local(db_path, embeddings, allow_dangerous_deserialization=True)
                 print("Loaded FAISS index from disk.")
            else:
                 print("FAISS index not found. Please run the ingestion script.")
                 # Create a dummy blank index to prevent complete failure
                 self.vector_store = FAISS.from_texts(["Gita guidance initializing..."], embeddings)
        except Exception as e:
            print(f"Error loading FAISS: {e}")
            return
            
        self.is_initialized = True
        print("RAG Engine Initialized")

    def chat(self, user_message: str) -> str:
        if not self.is_initialized or not self.client:
            return "System is not fully initialized. Please check API keys."

        # 1. Retrieve relevant context from FAISS
        context = ""
        if self.vector_store:
            try:
                results = self.vector_store.similarity_search(user_message, k=3)
                if results:
                    context = "\n\n".join([doc.page_content for doc in results])
            except Exception as e:
                print(f"Warning: Failed to query vector store: {e}")

        # 2. Construct prompt
        system_prompt = f"""You are a spiritual guide and companion.
You speak with calmness, compassion, and profound clarity. 
The user is here to seek guidance, share thoughts, or discuss their life—they will rarely ask direct questions ABOUT the Bhagavad Gita or the PDFs.
Your crucial role is to weave the timeless wisdom of the Bhagavad Gita and the context from the user's provided PDFs naturally into your responses to comfort, guide, and support them.

Context to draw wisdom from:
{context}
"""
        
        # 3. Generate response with Gemini
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=f"{system_prompt}\n\nUser Question: {user_message}"
            )
            return response.text
        except Exception as e:
            return f"Error generating response: {str(e)}"
