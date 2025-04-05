const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000; // Port for the server to run on

// Connect to the SQLite database
const dbPath = path.resolve(__dirname, 'movies.db');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the SQLite database.");
    }
});

// API endpoint to get all movies
app.get('/api/movies', (req, res) => {
    const sql = `SELECT id, name, description, trailer, poster, genre, link, rating, featured FROM movies`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ movies: rows });
    });
});

// Serve static files from the current directory (where index.html, style.css, script.js are)
app.use(express.static(__dirname));

// API endpoint is defined above this

// The static middleware will handle serving index.html for the root path.
// Removed the app.get('*', ...) route which caused an error.

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});
