const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json()); // Middleware to parse JSON bodies

// Serve static files from the 'src' directory
app.use(express.static(path.join(__dirname, '../src')));

// Send index.html for any other requests
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../src', 'index.html'));
});

// New endpoint to receive AI task data
app.post('/api/ai-task', (req, res) => {
    const taskData = req.body;
    console.log('Received AI task data:', taskData);
    res.status(200).json({ message: 'Task data received successfully!' });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
