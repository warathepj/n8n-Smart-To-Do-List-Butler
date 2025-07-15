const express = require('express');
const path = require('path');
const NodeFetch = require('node-fetch'); // Import node-fetch

const app = express();
const port = 3000;

// Store connected clients for SSE
let clients = [];

app.use(express.json()); // Middleware to parse JSON bodies

// Serve static files from the 'src' directory
app.use(express.static(path.join(__dirname, '../src')));

// Send index.html for any other requests
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../src', 'index.html'));
});

// New endpoint to receive AI task data
app.post('/api/ai-task', async (req, res) => {
    const taskData = req.body;
    console.log('Received AI task data:', taskData);

    const webhookUrl = 'http://localhost:5678/webhook-test/9c98d78c-7d72-4787-85b7-3912ca366e4e';

    try {
        const response = await NodeFetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskData),
        });

        if (response.ok) {
            console.log('Task data forwarded to webhook successfully!');
            res.status(200).json({ message: 'Task data received and forwarded successfully!' });
        } else {
            const errorText = await response.text();
            console.error('Failed to forward task data to webhook:', response.status, errorText);
            res.status(500).json({ message: 'Failed to forward task data to webhook.', error: errorText });
        }
    } catch (error) {
        console.error('Error forwarding task data to webhook:', error);
        res.status(500).json({ message: 'Error forwarding task data to webhook.', error: error.message });
    }
});

// New endpoint to receive webhook responses
app.post('/api/webhook-response', (req, res) => {
    const webhookResponseData = req.body;
    console.log('Received webhook response data:', webhookResponseData);

    // Send webhook response to all connected SSE clients
    clients.forEach(client => client.write(`data: ${JSON.stringify(webhookResponseData)}\n\n`));

    res.status(200).json({ message: 'Webhook response received successfully!' });
});

// New endpoint for Server-Sent Events
app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins for simplicity

    clients.push(res);

    req.on('close', () => {
        clients = clients.filter(client => client !== res);
        console.log('Client disconnected from SSE.');
    });

    console.log('New client connected to SSE.');
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
