'use client'; 

import { useState } from 'react';

export default function TestChatPage() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testAgent = async () => {
    if (!message) return;
    setIsLoading(true);
    setResponse(''); // Clear previous response
    
    try {
      // 1. Updated to match your exact Flask route
      const res = await fetch('http://localhost:5006/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 2. Updated to send "message" instead of "query"
        body: JSON.stringify({ 
          message: message,
          session_id: "test-user-123" // Taking advantage of your session logic!
        })
      });
      
      const data = await res.json();
      
      // 3. Updated to read "data.response"
      if (res.ok) {
        setResponse(data.response);
      } else {
        setResponse(data.error || "An unknown error occurred.");
      }
      
    } catch (error) {
      setResponse("Network error: Could not reach the Flask backend on port 5001.");
    }
    
    setIsLoading(false);
  };

  const resetAgent = async () => {
    try {
      await fetch('http://localhost:5001/api/agent/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: "test-user-123" })
      });
      setResponse("Conversation history cleared!");
    } catch (e) {
      setResponse("Failed to clear history.");
    }
  }

  return (
    <div className="p-10 max-w-2xl mx-auto mt-10 border-2 border-dashed border-gray-400 rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-black dark:text-white">Agent API Test Sandbox</h1>
        <button onClick={resetAgent} className="text-sm bg-red-500 text-white px-3 py-1 rounded">Reset Memory</button>
      </div>
      
      <input 
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a test question here (e.g., 'What is our total stock value?')"
        className="w-full p-3 mb-4 rounded border border-gray-300 text-black outline-none focus:border-blue-500"
      />
      
      <button 
        onClick={testAgent}
        disabled={isLoading}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded font-bold disabled:bg-gray-500 transition-colors"
      >
        {isLoading ? 'Agent is thinking...' : 'Send Message'}
      </button>

      <div className="mt-8 p-6 bg-gray-100 dark:bg-gray-800 rounded min-h-[100px] border border-gray-200 dark:border-gray-700 text-black dark:text-white">
        <strong>Agent Response:</strong>
        <p className="mt-2 whitespace-pre-wrap">{response}</p>
      </div>
    </div>
  );
}