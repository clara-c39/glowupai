const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json({limit: '50mb'}));

let lastAnalysisResult = null;

app.post('/process-photo', async (req, res) => {
  try {
    const { photo } = req.body;
    console.log('Received photo on server:', photo.substring(0, 100) + '...');
    lastAnalysisResult = { imageSrc: photo };
    console.log('Photo saved in lastAnalysisResult');
    res.json(lastAnalysisResult);
  } catch (error) {
    console.error('Error processing photo:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/color-analysis', (req, res) => {
  if (lastAnalysisResult) {
    res.json(lastAnalysisResult);
  } else {
    res.status(404).send('No analysis result available');
  }
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
