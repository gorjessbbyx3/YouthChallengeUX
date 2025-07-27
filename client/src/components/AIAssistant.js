import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Send as SendIcon,
  Psychology as PsychologyIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  Analytics as AnalyticsIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import axios from 'axios';

export const AIAssistant = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m your YCA CRM AI Assistant powered by Grok. I can help you with cadet management, behavioral analysis, academic tracking, and system insights. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentimentResult, setSentimentResult] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('auth');
      const response = await axios.post('/api/ai/chat', {
        message: input,
        context: 'yca_crm'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'I apologize, but I encountered an error. Please try again or contact your system administrator.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeSentiment = async (text) => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('auth');
      const response = await axios.post('/api/ai/analyze-sentiment', {
        text: text,
        type: 'general_text'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSentimentResult(response.data);
    } catch (error) {
      console.error('Sentiment analysis error:', error);
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

  const quickActions = [
    { label: 'Analyze High-Risk Cadets', query: 'Show me insights about our high-risk cadets and intervention strategies' },
    { label: 'HiSET Progress Report', query: 'Generate a summary of current HiSET completion rates and recommendations' },
    { label: 'Inventory Alerts', query: 'What inventory items need attention and restocking?' },
    { label: 'Mentorship Effectiveness', query: 'Analyze the effectiveness of our mentorship programs' }
  ];

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', p: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AIIcon color="primary" />
        AI Assistant (Grok)
      </Typography>

      {/* Quick Actions */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Grid container spacing={1}>
            {quickActions.map((action, index) => (
              <Grid item key={index}>
                <Chip
                  label={action.label}
                  onClick={() => setInput(action.query)}
                  variant="outlined"
                  size="small"
                />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Messages */}
      <Paper 
        sx={{ 
          flex: 1, 
          overflow: 'auto', 
          p: 1, 
          mb: 2,
          maxHeight: '60vh'
        }}
      >
        <List>
          {messages.map((message) => (
            <ListItem
              key={message.id}
              sx={{
                display: 'flex',
                flexDirection: message.type === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }}
            >
              <Avatar
                sx={{
                  bgcolor: message.type === 'user' ? 'primary.main' : 'secondary.main',
                  mx: 1
                }}
              >
                {message.type === 'user' ? <PersonIcon /> : <AIIcon />}
              </Avatar>
              <Paper
                sx={{
                  p: 2,
                  maxWidth: '70%',
                  bgcolor: message.type === 'user' ? 'primary.light' : 'grey.100'
                }}
              >
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {message.content}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 1, opacity: 0.7 }}
                >
                  {message.timestamp.toLocaleTimeString()}
                </Typography>
              </Paper>
            </ListItem>
          ))}
          {loading && (
            <ListItem>
              <Avatar sx={{ bgcolor: 'secondary.main', mx: 1 }}>
                <AIIcon />
              </Avatar>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Thinking...</Typography>
              </Box>
            </ListItem>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Paper>

      {/* Sentiment Analysis Results */}
      {sentimentResult && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AnalyticsIcon />
              Sentiment Analysis Results
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Sentiment:</strong> {sentimentResult.sentiment}
                </Typography>
                <Typography variant="body2">
                  <strong>Urgency:</strong> {sentimentResult.urgency}
                </Typography>
                <Typography variant="body2">
                  <strong>Confidence:</strong> {(sentimentResult.confidenceScore * 100).toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                {sentimentResult.riskFactors?.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    <strong>Risk Factors:</strong> {sentimentResult.riskFactors.join(', ')}
                  </Alert>
                )}
                {sentimentResult.recommendations?.length > 0 && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Recommendations:</Typography>
                    {sentimentResult.recommendations.map((rec, index) => (
                      <Typography key={index} variant="body2" sx={{ ml: 1 }}>
                        • {rec}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Input */}
      <Box sx={{ display: 'flex', gap: 1 }}>
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
      <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
        <Button
          size="small"
          onClick={() => analyzeSentiment(input)}
          disabled={!input.trim() || loading}
          startIcon={<PsychologyIcon />}
          variant="outlined"
        >
          Analyze Sentiment
        </Button>
      </Box>
    </Box>
  );
};