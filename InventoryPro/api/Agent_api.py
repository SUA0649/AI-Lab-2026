 
from flask import Flask, request, jsonify,Blueprint
from Agent.Agent import InventoryAgent
 

agent_bp = Blueprint("agent",__name__)

agent_sessions = {}
 
 
def get_or_create_agent(session_id: str) -> InventoryAgent:
    """Get existing agent or create new one for session"""
    if session_id not in agent_sessions:
        agent_sessions[session_id] = InventoryAgent()
    return agent_sessions[session_id]
 
 
@agent_bp.route('/api/agent/chat', methods=['POST'])
def chat():
    """
    Chat endpoint for the AI agent
    
    Request body:
    {
        "message": "user's message",
        "session_id": "unique session identifier (optional)"
    }
    
    Response:
    {
        "response": "agent's response",
        "session_id": "session identifier"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify({'error': 'Message is required'}), 400
        
        message = data['message']
        session_id = data.get('session_id', 'default')
        
        # Get or create agent for this session
        agent = get_or_create_agent(session_id)
        
        # Get response from agent
        response = agent.chat(message)
        
        return jsonify({
            'response': response,
            'session_id': session_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
 
 
@agent_bp.route('/api/agent/reset', methods=['POST'])
def reset_conversation():
    """
    Reset conversation history for a session
    
    Request body:
    {
        "session_id": "unique session identifier"
    }
    """
    try:
        data = request.get_json()
        session_id = data.get('session_id', 'default')
        
        if session_id in agent_sessions:
            agent_sessions[session_id].reset_conversation()
            return jsonify({'message': 'Conversation reset successfully'}), 200
        else:
            return jsonify({'message': 'No active session found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
 
 
@agent_bp.route('/api/agent/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'message': 'InventoryPro AI Agent API is running',
        'active_sessions': len(agent_sessions)
    }), 200