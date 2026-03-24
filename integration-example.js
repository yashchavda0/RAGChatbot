// Example: Integrating the RAG Chatbot into your existing application

const RAG_CHATBOT_CONFIG = {
  apiUrl: 'http://localhost:8000/api/v1',
  apiKey: 'your_integration_api_key_here'
};

class RAGChatbotClient {
  constructor(config) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.sessionId = `session_${Date.now()}`;
  }

  async chat(message, context = null) {
    try {
      const response = await fetch(`${this.apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          message,
          session_id: this.sessionId,
          context
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error chatting with RAG bot:', error);
      throw error;
    }
  }

  async getStatus() {
    try {
      const response = await fetch(`${this.apiUrl}/status`, {
        headers: {
          'X-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting status:', error);
      throw error;
    }
  }

  async getDocumentsSummary() {
    try {
      const response = await fetch(`${this.apiUrl}/documents/summary`, {
        headers: {
          'X-API-Key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting documents summary:', error);
      throw error;
    }
  }
}

// Usage Examples

// Initialize the client
const ragBot = new RAGChatbotClient(RAG_CHATBOT_CONFIG);

// Example 1: Simple chat
async function simpleChatExample() {
  try {
    const response = await ragBot.chat('What are the main topics covered in the documents?');
    console.log('Bot response:', response.response);
    console.log('Sources:', response.sources);
  } catch (error) {
    console.error('Chat failed:', error);
  }
}

// Example 2: Chat with context
async function contextChatExample() {
  const userContext = 'The user is a software developer looking for API documentation';
  
  try {
    const response = await ragBot.chat(
      'How do I implement authentication?',
      userContext
    );
    console.log('Bot response:', response.response);
  } catch (error) {
    console.error('Context chat failed:', error);
  }
}

// Example 3: Check system status before chatting
async function statusCheckExample() {
  try {
    const status = await ragBot.getStatus();
    
    if (status.ready) {
      console.log(`System ready! ${status.total_documents} documents with ${status.total_chunks} chunks`);
      
      const response = await ragBot.chat('Summarize the key points from all documents');
      console.log('Summary:', response.response);
    } else {
      console.log('System not ready - no documents uploaded yet');
    }
  } catch (error) {
    console.error('Status check failed:', error);
  }
}

// Example 4: Integration with a web chat widget
class ChatWidget {
  constructor(containerId, ragClient) {
    this.container = document.getElementById(containerId);
    this.ragClient = ragClient;
    this.messages = [];
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input-container">
        <input type="text" id="chat-input" placeholder="Ask about your documents...">
        <button id="send-btn">Send</button>
      </div>
    `;

    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    sendBtn.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;

    this.addMessage('user', message);
    input.value = '';

    try {
      const response = await this.ragClient.chat(message);
      this.addMessage('bot', response.response, response.sources);
    } catch (error) {
      this.addMessage('bot', 'Sorry, I encountered an error. Please try again.');
    }
  }

  addMessage(sender, text, sources = []) {
    const messagesContainer = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    let sourcesHtml = '';
    if (sources && sources.length > 0) {
      sourcesHtml = `<div class="sources">Sources: ${sources.join(', ')}</div>`;
    }

    messageDiv.innerHTML = `
      <div class="message-text">${text}</div>
      ${sourcesHtml}
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// Initialize chat widget
// const chatWidget = new ChatWidget('chat-widget-container', ragBot);

// Example 5: Bulk document processing status
async function monitorDocumentProcessing() {
  try {
    const summary = await ragBot.getDocumentsSummary();
    
    console.log('Document Processing Summary:');
    console.log(`Total documents: ${summary.total_documents}`);
    
    summary.documents.forEach(doc => {
      console.log(`- ${doc.filename}: ${doc.chunks} chunks (ID: ${doc.id})`);
    });
    
    return summary;
  } catch (error) {
    console.error('Failed to get document summary:', error);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { RAGChatbotClient, ChatWidget };
}