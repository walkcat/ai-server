const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  credentials: true
}));

// DeepSeek API configuration
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Helper function to format tasks
function formatTasks(tasks) {
  if (!Array.isArray(tasks)) {
    return JSON.stringify(tasks, null, 2);
  }
  
  return tasks.map((task, index) => {
    if (typeof task === 'object' && task !== null) {
      return `任务 ${index + 1}:\n${Object.entries(task)
        .map(([key, value]) => `  ${key}: ${value}`)
        .join('\n')}`;
    }
    return `- ${task}`;
  }).join('\n\n');
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, action, tasks } = req.body;

    // Handle both direct messages and action-based requests
    let chatMessages = messages;
    
    if (action && tasks) {
      // Convert action/tasks format to messages format
      const taskDescription = formatTasks(tasks);
      
      chatMessages = [{
        role: 'user',
        content: `Action: ${action}\n\nTasks:\n${taskDescription}`
      }];
    }

    if (!chatMessages || !Array.isArray(chatMessages)) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    if (!DEEPSEEK_API_KEY) {
      return res.status(500).json({ error: 'DeepSeek API key not configured' });
    }

    // Call DeepSeek API
    const response = await axios.post(
      `${DEEPSEEK_BASE_URL}/chat/completions`,
      {
        model: DEEPSEEK_MODEL,
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error calling DeepSeek API:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data?.error?.message || 'Failed to call DeepSeek API' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
