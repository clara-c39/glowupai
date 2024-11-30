const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});
const cors = require('cors');
app.use(cors());
app.use(express.json({limit: '50mb'}));

app.post('/process-photo', async (req, res) => {
  try {
    const { photo } = req.body;
    if (!photo) {
      return res.status(400).json({ error: 'No photo data received' });
    }

    // For now, just echo back the photo URL
    // Later we can add image processing here
    res.json({message: "Photo received"});
    // res.json({ url: photo });

  } catch (error) {
    console.error('Error processing photo:', error);
    res.status(500).json({ error: 'Failed to process photo' });
  }
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
