// server.js
// A simple Express.js backend for a Todo list API

const express = require('express');
var fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// TODO ➡️  Middleware to inlcude static content from 'public' folder
app.use(express.static(path.join(__dirname, 'public')))
//app.use(express.static('public'))

/*
// In-memory array to store todo items
let todos = [];
let nextId = 1;
*/

// setup the DB 
const dbPath = path.join(__dirname, 'todos.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database');
    
    // Create todos table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        priority TEXT DEFAULT 'low',
        isComplete INTEGER DEFAULT 0,
        isFun TEXT
      )
    `);
  }
});

// TODO ➡️ serve index.html from 'public' at the '/' path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// TODO ➡️ GET all todo items at the '/todos' path
app.get('/todos', (req, res) => {
  db.all('SELECT * FROM todos', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Error getting todos' });
    }
    
    // Convert SQLite integer to boolean for client-side use
    const todos = rows.map(row => ({
      ...row,
      isComplete: row.isComplete === 1
    }));
    
    res.json(todos);
  });
});



// GET a specific todo item by ID
app.get('/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  db.get('SELECT * FROM todos WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Error retrieving todo' });
    }
    
    if (row) {
      // Convert SQLite integer to boolean
      const todo = {
        ...row,
        isComplete: row.isComplete === 1
      };
      res.json(todo);
    } else {
      res.status(404).json({ message: 'Todo item not found' });
    }
  });
});

// POST a new todo item
app.post('/todos', (req, res) => {
  const { name, priority = 'low', isFun } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  const sql = 'INSERT INTO todos (name, priority, isComplete, isFun) VALUES (?, ?, ?, ?)';
  const params = [name, priority, 0, isFun];
  
  db.run(sql, params, function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Error creating todo' });
    }
    
    // Get ID of the new row
    const newTodo = {
      id: this.lastID,
      name,
      priority,
      isComplete: false,
      isFun
    };
    
    // Log the new todo item
    fs.appendFile(
      path.join(__dirname, 'todo.log'), 
      JSON.stringify(newTodo) + '\n', 
      err => {
        if (err) console.error('Error writing to log:', err);
      }
    );
    
    res.status(201).json(newTodo);
  });
});

// DELETE a todo item by ID
app.delete('/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  // Check if item exists or not
  db.get('SELECT id FROM todos WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Error checking todo existence' });
    }
    
    if (!row) {
      return res.status(404).json({ message: 'Todo item not found' });
    }
    
    // If item exists, delete
    db.run('DELETE FROM todos WHERE id = ?', [id], function(err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ message: 'Error deleting todo' });
      }
      
      res.json({ message: `Todo item ${id} deleted.` });
    });
  });
});

// Start the server
// TODO ➡️ Start the server by listening on the specified PORT

app.listen(PORT, () => {
  console.log(`Todo API server running at http://localhost:${PORT}`);
});

// close database
process.on('SIGINT', () => {
  db.close(err => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});