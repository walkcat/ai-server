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

// Helper function to format tasks - improved version
function formatTasks(tasks) {
  // If tasks is an array, format each item
  if (Array.isArray(tasks)) {
    return tasks.map((task, index) => {
      if (typeof task === 'object' && task !== null) {
        return `任务 ${index + 1}:\n${Object.entries(task)
          .map(([key, value]) => `  ${key}: ${value}`)
          .join('\n')}`;
      }
      return `任务 ${index + 1}: ${task}`;
    }).join('\n\n');
  }
  
  // If tasks is an object, format it as key-value pairs
  if (typeof tasks === 'object' && tasks !== null) {
    return Object.entries(tasks)
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key}:\n${JSON.stringify(value, null, 2)}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n\n');
  }
  
  // If tasks is a string or other type, just return it as is
  return String(tasks);
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
        stream: false,
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

    // Extract the response content
    const content = response.data.choices[0].message.content;

    // Send back as plain JSON
    res.json({
      success: true,
      message: content,
      usage: response.data.usage
    });

  } catch (error) {
    console.error('Error calling DeepSeek API:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`AI Server running on port ${PORT}`);
});
