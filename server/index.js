const express = require('express');
const path = require('path');

const app = express();
const port = 3000;

// Serve static files from the 'src' directory
app.use(express.static(path.join(__dirname, '../src')));

// Send index.html for any other requests
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../src', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
