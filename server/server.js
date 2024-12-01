require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});
const cors = require('cors');
app.use(cors());
app.use(express.json({limit: '50mb'}));

console.log(process.env.OPENAI_API_KEY);
// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure to set this in your environment variables
});


app.post('/process-colour', async (req, res) => {
  try {
    const { colour } = req.body;
    const colorString = rgbToString(colour);
    console.log(colorString);
    if (!colour) {
      return res.status(400).json({ error: 'No colour data received' });
    }
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a color analysis expert. Given a color, and analyzing the undertones, determine which seasonal color palette (Winter, Spring, Summer, or Autumn) it best belongs to. Provide a one sentence explanation why."
        },
        {
          role: "user",
          content: `Analyze this color: ${colorString}. Which one of the four seasonal color palettes does it belong to?`
        }
      ],
      model: "gpt-4o-mini",
    });
  
    const analysis = completion.choices[0].message.content;


    // For now, just echo back the photo URL
    // Later we can add image processing here

    //const analysis = "Given these characteristics, this color best fits the **Autumn** color palette. Autumn palettes typically feature warm, muted, and rich tones that resonate with the changing colors of the season, such as burnt oranges, deep reds, and rich browns. The softness and warmth of the given color align well with the earthy and organic feel characteristic of Autumn. The color rgb(198, 137, 130) belongs to the Autumn color palette. This RGB value presents a warm, muted tone with brownish undertones, characteristic of the Autumn palette.";
    console.log(analysis);
    res.json({message: analysis});
    // res.json({ url: photo });

  } catch (error) {
    console.error('Error processing colour:', error);
    res.status(500).json({ error: 'Failed to process colour' });
  }
});

app.listen(3001, () => {
  console.log('Server running on port 3001');
});

function rgbToString(rgbObject) {
  const { r, g, b } = rgbObject; // Destructure the object
  return `rgb(${r}, ${g}, ${b})`;
}