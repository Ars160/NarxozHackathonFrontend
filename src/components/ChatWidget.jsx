import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';
import { aiApi } from '../services/Api';
import '../styles/style.css';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Здравствуйте! Я ваш ИИ-помощник. Чем могу помочь?", isUser: false }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, isUser: true };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await aiApi.chatSend(input, null);
      
      const botMessage = { text: response.answer || "Нет ответа", isUser: false };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = { text: "Извините, произошла ошибка сети.", isUser: false };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="position-fixed" style={{ bottom: '20px', right: '20px', zIndex: 1050 }}>
      {isOpen ? (
        <div className="card shadow border-0 d-flex flex-column" style={{ width: '350px', height: '500px' }}>
          {/* Header */}
          <div className="card-header border-0 text-white d-flex justify-content-between align-items-center" style={{ backgroundColor: '#C8102E' }}>
            <span className="fw-bold fs-5">AI Помощник</span>
            <button className="btn btn-sm text-white" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          {/* Messages */}
          <div className="card-body overflow-auto flex-grow-1 p-3 bg-light">
            {messages.map((msg, index) => (
              <div key={index} className={`d-flex mb-3 ${msg.isUser ? 'justify-content-end' : 'justify-content-start'}`}>
                <div 
                  className={`p-2 px-3 rounded shadow-sm`}
                  style={{
                    maxWidth: '85%',
                    backgroundColor: msg.isUser ? '#C8102E' : '#ffffff',
                    color: msg.isUser ? '#ffffff' : '#333333',
                    border: msg.isUser ? 'none' : '1px solid #e0e0e0'
                  }}
                >
                  <span style={{ whiteSpace: 'pre-line' }}>{msg.text}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="d-flex justify-content-start mb-3">
                <div className="p-2 px-3 rounded text-muted bg-white border" style={{ maxWidth: '85%' }}>
                  <small><em>Печатает...</em></small>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="card-footer bg-white border-top p-2 d-flex align-items-center gap-2">
            <input 
              type="text" 
              className="form-control" 
              placeholder="Введите сообщение..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <button 
              className="btn text-white d-flex align-items-center justify-content-center" 
              style={{ backgroundColor: '#C8102E', minWidth: '45px' }}
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : (
        <button 
          className="btn rounded-circle shadow-lg d-flex align-items-center justify-content-center text-white" 
          style={{ width: '60px', height: '60px', backgroundColor: '#C8102E' }}
          onClick={() => setIsOpen(true)}
        >
          <MessageSquare size={28} />
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
