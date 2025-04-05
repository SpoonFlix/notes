const sqlite3 = require('sqlite3').verbose();

// Create or open the database file
const db = new sqlite3.Database('./movies.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the SQLite database.");
    }
});

// SQL statement to create the movies table
const createTableSql = `
CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    trailer TEXT,
    poster TEXT,
    genre TEXT,
    link TEXT,
    rating REAL,
    featured INTEGER DEFAULT 0 -- 0 for No, 1 for Yes
);`;

// SQL statement to insert sample data (optional, but helpful for testing)
const insertSampleDataSql = `
INSERT INTO movies (name, description, trailer, poster, genre, link, rating, featured) VALUES
('Inception', 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.', 'https://www.youtube.com/embed/YoHD9XEInc0', 'https://via.placeholder.com/200x300?text=Inception', 'Sci-Fi, Thriller', '/inception', 8.8, 1),
('The Matrix', 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.', 'https://www.youtube.com/embed/vKQi3bBA1y8', 'https://via.placeholder.com/200x300?text=The+Matrix', 'Action, Sci-Fi', '/matrix', 8.7, 1),
('Interstellar', 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity''s survival.', 'https://www.youtube.com/embed/zSWdZVtXT7E', 'https://via.placeholder.com/200x300?text=Interstellar', 'Adventure, Drama, Sci-Fi', '/interstellar', 8.6, 0),
('Parasite', 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.', 'https://www.youtube.com/embed/5xH0HfJHsaY', 'https://via.placeholder.com/200x300?text=Parasite', 'Comedy, Drama, Thriller', '/parasite', 8.6, 0),
('Spirited Away', 'During her family''s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts.', 'https://www.youtube.com/embed/ByXuk9QqQkk', 'https://via.placeholder.com/200x300?text=Spirited+Away', 'Animation, Adventure, Family', '/spirited-away', 8.6, 1),
('The Dark Knight', 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.', 'https://www.youtube.com/embed/EXeTwQWrcwY', 'https://via.placeholder.com/200x300?text=Dark+Knight', 'Action, Crime, Drama', '/dark-knight', 9.0, 1);
`;

db.serialize(() => {
    // Run the CREATE TABLE statement
    db.run(createTableSql, (err) => {
        if (err) {
            return console.error("Error creating table:", err.message);
        }
        console.log("Table 'movies' created or already exists.");

        // Check if table is empty before inserting sample data
        db.get("SELECT COUNT(*) as count FROM movies", (err, row) => {
            if (err) {
                return console.error("Error checking table count:", err.message);
            }

            if (row.count === 0) {
                // Run the INSERT statement only if the table is empty
                db.run(insertSampleDataSql, (err) => {
                    if (err) {
                        return console.error("Error inserting sample data:", err.message);
                    }
                    console.log("Sample data inserted into 'movies' table.");
                    // Close the database connection after operations are done
                    db.close((err) => {
                        if (err) {
                            console.error("Error closing database:", err.message);
                        } else {
                            console.log("Database connection closed.");
                        }
                    });
                });
            } else {
                console.log("Table 'movies' already contains data. Skipping sample data insertion.");
                 // Close the database connection if no insertion happened
                 db.close((err) => {
                    if (err) {
                        console.error("Error closing database:", err.message);
                    } else {
                        console.log("Database connection closed.");
                    }
                });
            }
        });
    });
});
