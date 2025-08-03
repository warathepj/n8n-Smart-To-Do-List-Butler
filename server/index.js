const express = require('express');
const path = require('path');
const fs = require('fs').promises; // Import fs.promises for async file operations
const NodeFetch = require('node-fetch'); // Import node-fetch

const app = express();
const port = 3000;

// Store connected clients for SSE
let clients = [];

app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Middleware for url-encoded bodies

// Serve static files from the 'src' directory
app.use(express.static(path.join(__dirname, '../src')));

// Send index.html for any other requests
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../src', 'index.html'));
});

// Helper function to read tasks from data.json
async function readTasks() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'data.json'), 'utf8');
        // If data is empty, return an empty array to prevent JSON.parse error
        if (data.trim() === '') {
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // If file doesn't exist, return empty array
            return [];
        }
        throw error;
    }
}

// Helper function to write tasks to data.json
async function writeTasks(tasks) {
    await fs.writeFile(path.join(__dirname, 'data.json'), JSON.stringify(tasks, null, 2), 'utf8');
}

// API endpoint to get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await readTasks();
        res.status(200).json(tasks);
    } catch (error) {
        console.error('Error reading tasks:', error);
        res.status(500).json({ message: 'Error retrieving tasks.', error: error.message });
    }
});

// API endpoint to add a new task
app.post('/api/tasks', async (req, res) => {
    const newTask = req.body;
    try {
        const tasks = await readTasks();
        tasks.push(newTask);
        await writeTasks(tasks);
        res.status(201).json({ message: 'Task added successfully!', task: newTask });
    } catch (error) {
        console.error('Error adding task:', error);
        res.status(500).json({ message: 'Error adding task.', error: error.message });
    }
});

// API endpoint to update a task
app.put('/api/tasks/:id', async (req, res) => {
    const taskId = req.params.id;
    const updatedTaskData = req.body;
    try {
        let tasks = await readTasks();
        const taskIndex = tasks.findIndex(task => task.id === taskId);

        if (taskIndex > -1) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...updatedTaskData };
            await writeTasks(tasks);
            res.status(200).json({ message: 'Task updated successfully!', task: tasks[taskIndex] });
        } else {
            res.status(404).json({ message: 'Task not found.' });
        }
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Error updating task.', error: error.message });
    }
});

// API endpoint to delete a task
app.delete('/api/tasks/:id', async (req, res) => {
    const taskId = req.params.id;
    try {
        let tasks = await readTasks();
        const initialLength = tasks.length;
        tasks = tasks.filter(task => task.id !== taskId);

        if (tasks.length < initialLength) {
            await writeTasks(tasks);
            res.status(200).json({ message: 'Task deleted successfully!' });
        } else {
            res.status(404).json({ message: 'Task not found.' });
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ message: 'Error deleting task.', error: error.message });
    }
});

// Helper function to read agent responses from agent-response.json
async function readAgentResponses() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'agent-response.json'), 'utf8');
        if (data.trim() === '') {
            return [];
        }
        const parsedData = JSON.parse(data);
        // Ensure the parsed data is always an array
        return Array.isArray(parsedData) ? parsedData : [parsedData];
    } catch (error) {
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

// Helper function to write agent responses to agent-response.json
async function writeAgentResponses(responses) {
    await fs.writeFile(path.join(__dirname, 'agent-response.json'), JSON.stringify(responses, null, 2), 'utf8');
}

// New endpoint to receive AI task data
app.post('/api/ai-task', async (req, res) => {
    console.log('[/api/ai-task] Endpoint hit.');
    const taskData = JSON.parse(req.body.task);
    console.log('[/api/ai-task] Received AI task data:', taskData);

    const webhookUrl = 'http://localhost:5678/webhook/9c98d78c-7d72-4787-85b7-3912ca366e4e';

    try {
        console.log('[/api/ai-task] Attempting to forward task data to webhook:', webhookUrl);
        const response = await NodeFetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(taskData),
        });
        console.log('[/api/ai-task] Webhook response received. Status:', response.status);

        if (response.ok) {
            const responseData = await response.json(); // Assuming the webhook response is JSON
            console.log('Task data forwarded to webhook successfully! Webhook response:', responseData);

            // Save responseData to server/agent-response.json, handling existing IDs
            console.log('[/api/ai-task] Reading existing agent responses.');
            let agentResponses = await readAgentResponses();
            const existingResponseIndex = agentResponses.findIndex(r => r.id === responseData.id);

            if (existingResponseIndex > -1) {
                // Update existing response
                agentResponses[existingResponseIndex] = { ...agentResponses[existingResponseIndex], ...responseData };
                console.log('[/api/ai-task] Updating existing agent response for ID:', responseData.id);
            } else {
                // Add new response
                agentResponses.push(responseData);
                console.log('[/api/ai-task] Adding new agent response for ID:', responseData.id);
            }
            await writeAgentResponses(agentResponses);
            console.log('[/api/ai-task] Webhook response data saved/updated in agent-response.json');

            if (responseData.id) {
                console.log('[/api/ai-task] Redirecting to /task.html with ID:', responseData.id);
                return res.redirect(`/task.html?id=${responseData.id}`);
            }

            res.status(200).json({ message: 'Task data received and forwarded successfully!', webhookResponse: responseData });
        } else {
            const errorText = await response.text();
            console.error('[/api/ai-task] Failed to forward task data to webhook. Status:', response.status, 'Error:', errorText);
            res.status(500).json({ message: 'Failed to forward task data to webhook.', error: errorText });
        }
    } catch (error) {
        console.error('[/api/ai-task] Error forwarding task data to webhook:', error);
        res.status(500).json({ message: 'Error forwarding task data to webhook.', error: error.message });
    }
});

// New endpoint to receive webhook responses
app.post('/api/webhook-response', async (req, res) => {
    const webhookResponseData = req.body;
    console.log('Received webhook response data:', webhookResponseData);

    try {
        // Extract the JSON string from the 'output' field and remove markdown formatting
        let rawJsonString = webhookResponseData.output;
        if (rawJsonString && typeof rawJsonString === 'string') {
            rawJsonString = rawJsonString.replace(/```json\n|```/g, '').trim();
        } else {
            throw new Error('Webhook response output is not a valid string.');
        }

        const parsedWebhookData = JSON.parse(rawJsonString);
        // Transform 'id' and 'response' into objects
        const taskId = { value: parsedWebhookData.id };
        const responseContent = { content: parsedWebhookData.response };

        // Create a new object with the transformed fields,
        // preserving other fields from parsedWebhookData if any
        const transformedWebhookData = {
            ...parsedWebhookData,
            id: taskId,
            response: responseContent
        };

        let tasks = await readTasks();
        const taskIndex = tasks.findIndex(task => task.id === taskId.value); // Use taskId.value for comparison

        if (taskIndex > -1) {
            // Merge the new data into the existing task, preserving existing fields
            tasks[taskIndex] = {
                ...tasks[taskIndex],
                ...transformedWebhookData, // Use the transformed data here
            };
            await writeTasks(tasks);
            res.status(200).json({ message: 'Webhook response received and task updated successfully!', task: tasks[taskIndex] });
        } else {
            console.warn(`Task with ID ${taskId} not found for webhook update.`);
            res.status(404).json({ message: 'Task not found for update based on webhook response.' });
        }
    } catch (error) {
        console.error('Error processing webhook response:', error);
        res.status(500).json({ message: 'Error processing webhook response.', error: error.message });
    }
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

// New endpoint to get agent response data
app.get('/api/agent-response', async (req, res) => {
    try {
        const responses = await readAgentResponses();
        res.status(200).json(responses);
    } catch (error) {
        console.error('Error reading agent-response.json:', error);
        res.status(500).json({ message: 'Error retrieving agent response.', error: error.message });
    }
});

// New endpoint to get task text by ID from data.json
app.get('/api/task-details/:id', async (req, res) => {
    const taskId = req.params.id;
    try {
        const tasks = await readTasks();
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            res.status(200).json({ text: task.text });
        } else {
            res.status(404).json({ message: 'Task not found.' });
        }
    } catch (error) {
        console.error('Error reading task details:', error);
        res.status(500).json({ message: 'Error retrieving task details.', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
