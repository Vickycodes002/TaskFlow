require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

app.post('/api/generate-subtasks', async (req, res) => {
  try {
    const { taskTitle, taskDesc } = req.body;

    const response = await axios.post(
      OPENAI_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: `Break the task "${taskTitle}${taskDesc ? ' - ' + taskDesc : ''}" into 3-5 smaller actionable subtasks. Return only a numbered list of subtasks without any additional text.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to generate subtasks' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}`));