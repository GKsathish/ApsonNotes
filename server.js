const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MySQL Connection Pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'RMT_PORTAL',
  connectionLimit: 10
});

// Routes
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Failed to register user' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', username);

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    console.log('User query result:', rows);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    console.log('User found:', user);

    const match = await bcrypt.compare(password, user.password);
    console.log('Password match:', match);

    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.get('/api/notes', async (req, res) => {
  const { userId } = req.query; // Assuming userId is passed as a query parameter

  try {
    const [rows] = await pool.query(
      'SELECT * FROM notes WHERE userId = ?',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Failed to fetch notes' });
  }
});

app.post('/api/notes', async (req, res) => {
  const { title, content, color, tags, userId } = req.body; // Assuming userId is passed in the body

  try {
    const [result] = await pool.query(
      'INSERT INTO notes (title, content, color, userId) VALUES (?, ?, ?, ?)',
      [title, content, color, userId]
    );

    const noteId = result.insertId;

    if (tags && tags.length > 0) {
      // Insert tags associated with the note into notes_tags table
      const tagValues = tags.map(tag => [noteId, tag]);
      await pool.query(
        'INSERT INTO notes_tags (note_id, tag_id) VALUES ?',
        [tagValues]
      );
    }

    res.status(201).json({ message: 'Note created successfully' });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: 'Failed to create note' });
  }
});

// Other API routes for update, delete, archive, trash, etc.

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
