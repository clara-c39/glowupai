const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});
const cors = require('cors');
app.use(cors());
app.use(express.json({limit: '50mb'}));

app.post('/process-colour', async (req, res) => {
  try {
    const { colour } = req.body;
    if (!colour) {
      return res.status(400).json({ error: 'No colour data received' });
    }

    // For now, just echo back the photo URL
    // Later we can add image processing here
    console.log(colour);
    res.json({message: "Colour received"});
    // res.json({ url: photo });

  } catch (error) {
    console.error('Error processing colour:', error);
    res.status(500).json({ error: 'Failed to process colour' });
  }
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});
