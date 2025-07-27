
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as PsychologyIcon,
  AutoAwesome as AIIcon
} from '@mui/icons-material';
import axios from 'axios';

export const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      type: 'assistant',
      content: 'Hello! I\'m your AI assistant for the YCA CRM system. I can help with cadet management, sentiment analysis, intervention recommendations, and more. How can I assist you today?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState('general');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      type: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setInput('');

    try {
      const token = localStorage.getItem('auth');
      const response = await axios.post('/api/ai/chat', {
        message: input,
        context
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const assistantMessage = {
        type: 'assistant',
        content: response.data.response,
        suggestions: response.data.suggestions,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        type: 'error',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const analyzeSentiment = async (text) => {
    try {
      const token = localStorage.getItem('auth');
      const response = await axios.post('/api/ai/analyze-sentiment', {
        text
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const analysisMessage = {
        type: 'analysis',
        content: 'Sentiment Analysis Results:',
        analysis: response.data,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, analysisMessage]);
    } catch (error) {
      console.error('Sentiment analysis error:', error);
    }
  };

  const quickActions = [
    { label: 'Cadet Help', context: 'cadet' },
    { label: 'Staff Support', context: 'staff' },
    { label: 'Reports', context: 'reports' },
    { label: 'Schedule', context: 'schedule' }
  ];

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AIIcon color="primary" />
        AI Assistant
      </Typography>

      {/* Context Selection */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          Context:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {quickActions.map((action) => (
            <Chip
              key={action.context}
              label={action.label}
              variant={context === action.context ? 'filled' : 'outlined'}
              onClick={() => setContext(action.context)}
              color="primary"
            />
          ))}
        </Box>
      </Box>

      {/* Messages */}
      <Paper 
        sx={{ 
          flex: 1, 
          p: 2, 
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 250px)'
        }}
      >
        <List>
          {messages.map((message, index) => (
            <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <Box sx={{ 
                alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                width: '100%'
              }}>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: message.type === 'user' ? 'primary.main' : 
                                   message.type === 'error' ? 'error.light' :
                                   message.type === 'analysis' ? 'info.light' : 'grey.100',
                    color: message.type === 'user' ? 'white' : 'inherit'
                  }}
                >
                  <Typography variant="body1">
                    {message.content}
                  </Typography>
                  
                  {message.type === 'analysis' && message.analysis && (
                    <Card sx={{ mt: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                          Analysis Results
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                          <Chip 
                            label={`Sentiment: ${message.analysis.sentiment}`}
                            color={message.analysis.sentiment === 'positive' ? 'success' : 
                                   message.analysis.sentiment === 'negative' ? 'error' : 'default'}
                          />
                          <Chip 
                            label={`Urgency: ${message.analysis.urgency}`}
                            color={message.analysis.urgency === 'high' ? 'error' : 
                                   message.analysis.urgency === 'medium' ? 'warning' : 'success'}
                          />
                        </Box>
                        {message.analysis.recommendations && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Recommendations:
                            </Typography>
                            {message.analysis.recommendations.map((rec, i) => (
                              <Typography key={i} variant="body2" sx={{ ml: 2 }}>
                                • {rec}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  
                  {message.suggestions && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Suggestions:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {message.suggestions.map((suggestion, i) => (
                          <Chip
                            key={i}
                            label={suggestion}
                            size="small"
                            variant="outlined"
                            onClick={() => setInput(suggestion)}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            </ListItem>
          ))}
          {loading && (
            <ListItem>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  AI is thinking...
                </Typography>
              </Box>
            </ListItem>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Paper>

      {/* Input */}
      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything about the YCA CRM system..."
          disabled={loading}
        />
        <Button
          variant="contained"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          sx={{ minWidth: 'auto', px: 2 }}
        >
          <SendIcon />
        </Button>
      </Box>

      {/* Quick Analysis */}
      <Box sx={{ mt: 1 }}>
        <Button
          size="small"
          onClick={() => analyzeSentiment(input)}
          disabled={!input.trim()}
          startIcon={<PsychologyIcon />}
        >
          Analyze Sentiment
        </Button>
      </Box>
    </Box>
  );
};
