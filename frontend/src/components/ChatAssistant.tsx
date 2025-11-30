import React, { useState, useRef, useEffect } from 'react'
import {
  Send,
  Bot,
  User,
  MessageCircle,
  X,
  Camera,
  BarChart3,
  TrendingUp,
  Sparkles,
  Loader2,
  Clock,
  Eye,
  AlertCircle
} from 'lucide-react';
import { cameraAPI ,historyApi} from '../services/api';
import { ChatHistoryItem, Camera as CameraType } from '../types';
import toast from 'react-hot-toast';

interface ChatAssistantProps {
  cameras: CameraType[];
  selectedCameraId?: string;
  onClose: () => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ cameras, selectedCameraId, onClose }) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<string>(selectedCameraId || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const exampleQuestions = [
    "What objects were detected most today?",
    "Show me detection trends for the last hour",
    "Which camera has the highest activity?",
    "How many people were detected this week?",
    "What are the peak detection hours?",
    "Compare detection rates between cameras"
  ];

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);

    const newUserMessage: ChatHistoryItem = {
      userMessage,
      aiResponse: '',
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, newUserMessage]);

    try {
      const response = await cameraAPI.chatWithAssistant({
        message: userMessage,
        camera_id: selectedCamera || undefined
      });

      setChatHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          aiResponse: response.response
        };
        return updated;
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to get response from AI assistant', { duration: 3000 });

      setChatHistory(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          aiResponse: 'Sorry, I encountered an error while processing your request. Please check your connection and try again.'
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  
  const handleExampleClick = (example: string) => {
    setMessage(example);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    handleClearChat();
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    const loadChatHistory = async () => {
      if (selectedCamera) {
        setIsLoadingHistory(true);
        try {
          const history = await historyApi.fetchChatHistory(selectedCamera);
          // Transform the API response format to our internal format
          const transformedHistory = history.map((item: any) => ({
            userMessage: item.user_message || item.userMessage,
            aiResponse: item.ai_response || item.aiResponse,
            timestamp: item.timestamp,
            camera_id: item.camera_id
          }));
          setChatHistory(transformedHistory);
          if (transformedHistory.length > 0) {
            toast.success(
              `📝 Loaded ${transformedHistory.length} previous message${transformedHistory.length === 1 ? '' : 's'}\n📹 ${cameras.find(c => c.id === selectedCamera)?.name}`,
              {
                duration: 2000,
                style: {
                  background: '#3B82F6',
                  color: '#fff',
                  borderRadius: '12px',
                  fontWeight: '500'
                }
              }
            );
          }
        } catch (error) {
          console.error('Error loading chat history:', error);
          toast.error(
            `📱 Failed to load chat history\n🔄 Please try refreshing`,
            {
              duration: 4000,
              style: {
                background: '#F59E0B',
                color: '#fff',
                borderRadius: '12px',
                fontWeight: '500'
              }
            }
          );
        } finally {
          setIsLoadingHistory(false);
        }
      } else {
        setChatHistory([]);
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [selectedCamera]);

  const handleClearChat = async () => {
    if (!selectedCamera) {
      toast.error('Please select a camera first', { duration: 2000 });
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await historyApi.clearChatHistory(selectedCamera);
      setChatHistory([]);
      
      // Beautiful success notification
      toast.success(
        `✨ Chat history cleared successfully!\n📹 ${cameras.find(c => c.id === selectedCamera)?.name}`,
        {
          duration: 2500,
          style: {
            background: '#10B981',
            color: '#fff',
            borderRadius: '12px',
            fontWeight: '500'
          }
        }
      );
    } catch (error) {
      console.error('Error clearing chat history:', error);
      
      // Beautiful error notification
      toast.error(
        `❌ Failed to clear chat history\n🔄 Please try again`,
        {
          duration: 3500,
          style: {
            background: '#EF4444',
            color: '#fff',
            borderRadius: '12px',
            fontWeight: '500'
          }
        }
      );
    }
  };

  return (
    <>
      {/* Beautiful Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Clear Chat History</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="text-gray-700 mb-3">
                  Are you sure you want to delete all chat history for:
                </p>
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                  <Camera className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-800">
                    {cameras.find(c => c.id === selectedCamera)?.name}
                  </span>
                </div>
                <p className="text-sm text-red-600 mt-3 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  All messages will be permanently deleted
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 transform"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-5/6 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white bg-opacity-20 rounded-xl">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Analytics Assistant</h2>
              <p className="text-blue-100 text-sm">Your intelligent camera data analyst</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {chatHistory.length > 0 && (
              <button
                onClick={handleClearChat}
                className="text-white hover:text-red-200 transition-all duration-200 text-sm px-4 py-2 border border-white border-opacity-30 rounded-lg hover:bg-red-500 hover:bg-opacity-20 hover:border-red-300 flex items-center gap-2 hover:scale-105 transform"
                title="Clear all chat history for this camera"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Chat
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white hover:text-red-200 transition-colors p-2 hover:bg-white hover:bg-opacity-10 rounded-lg"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Camera className="h-5 w-5" />
              <label className="text-sm font-medium">Focus on camera:</label>
            </div>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="flex-1 max-w-xs p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All cameras</option>
              {cameras.map(camera => (
                <option key={camera.id} value={camera.id}>
                  📹 {camera.name} ({camera.ip_address})
                </option>
              ))}
            </select>
            {selectedCamera && (
              <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                <Eye className="h-3 w-3" />
                Focused
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                <p className="text-gray-600">Loading chat history...</p>
              </div>
            </div>
          ) : chatHistory.length === 0 ? (
            <div className="text-center space-y-6 mt-8">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="h-10 w-10 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Welcome to Your AI Assistant!</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  I can help you analyze your camera detection data, identify trends, and provide insights about your surveillance system.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 max-w-2xl mx-auto">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Try asking me:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {exampleQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(question)}
                      className="text-left p-3 text-sm text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200 hover:border-blue-200"
                    >
                      <span className="text-blue-500">💬</span> {question}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Trends
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Real-time
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {chatHistory.map((chat, index) => (
                <div key={index} className="space-y-4">
                  <div className="flex justify-end">
                    <div className="flex items-start gap-3 max-w-3/4">
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl px-4 py-3 max-w-full shadow-lg">
                        <p className="text-sm leading-relaxed">{chat.userMessage}</p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-blue-100">
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(chat.timestamp)}
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>

                  {chat.aiResponse && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-3 max-w-4/5">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-white rounded-2xl px-4 py-3 shadow-lg border border-gray-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-3 w-3 text-green-500" />
                            <span className="text-xs font-medium text-green-600">AI Assistant</span>
                          </div>
                          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                            {chat.aiResponse.includes('I\'m sorry, I encountered an error') ? (
                              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-red-700 font-medium text-xs mb-1">Service Error</p>
                                  <p className="text-red-600 text-xs">
                                    The AI service was temporarily unavailable. Please try your question again.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p>{chat.aiResponse}</p>
                                {chat.aiResponse.includes('total of') && (
                                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                                    💡 Detection data successfully analyzed
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {index === chatHistory.length - 1 && !chat.aiResponse && isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-white rounded-2xl px-4 py-3 shadow-lg border border-clear-100">
                          <div className="flex items-center gap-3">
                            <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce"></div>
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span className="text-sm text-gray-600">Analyzing your data...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-white">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  selectedCamera
                    ? `Ask about ${cameras.find(c => c.id === selectedCamera)?.name || 'selected camera'}...`
                    : "Ask me anything about your detection analytics..."
                }
                className="w-full p-4 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-sm"
                rows={2}
                disabled={isLoading}
              />
              <div className="absolute right-3 bottom-3 text-xs text-gray-400">Enter to send</div>
            </div>

            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg transform hover:scale-105 disabled:transform-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </div>

          {selectedCamera && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 text-blue-600">
                <AlertCircle className="h-3 w-3" />
                <span>Focused on: <strong>{cameras.find(c => c.id === selectedCamera)?.name}</strong></span>
              </div>
              <button
                onClick={() => setSelectedCamera('')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear focus
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
};

export default ChatAssistant;
