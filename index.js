const express = require('express');
const connection = require('./db');

const port = 5000;
const app = express();
const cors = require('cors');

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
];
const corsOptions = {
  origin: (origin, callback) => {
    if (origin === undefined || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

const { check } = require('express-validator');
const { connect } = require('./db');

app.get('/', (req, res) => {
  res.send('Welcome to ticketing backend!');
});

// post data to ticket table

app.post('/submit-form', (req, res) => {
  const { contact_reason, message } = req.body;
  console.log('body', req.body);
  connection.query(
    'INSERT INTO ticket(contact_reason, message) VALUES (?, ?)',
    [contact_reason, message],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to display ticket');
      } else {
        res.status(200).json(results);
      }
    }
  );
});

//display alltickets

app.get('/get-alltickets', (req, res) => {
  const allTickets = req.body;
  connection.query('SELECT * FROM ticket', [allTickets], (err, results) => {
    if (err) {
      console.log(err);
      res.status(500).send('An error occurred to display all tickets');
    } else {
      console.log('results', results);
      res.status(200).json(results);
    }
  });
});

// get all users
app.get('/users', (req, res) => {
  const users = req.body;
  connection.query('SELECT * FROM users', [users], (err, results) => {
    if (err) {
      console.log(err);
      res.status(500).send('An error occurred to display all users');
    } else {
      console.log('results', results);
      res.status(200).json(results);
    }
  });
});

// get one user
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  connection.query(
    'SELECT * FROM users WHERE id = ?',
    [userId],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to display the selected user');
      } else {
        console.log('results', results);
        res.status(200).json(results);
      }
    }
  );
});

//add a user

app.post('/users', (req, res) => {
  const { username, role, email, password } = req.body;
  connection.query(
    'INSERT INTO users (username, role, email, password) VALUES (?, ?, ?, ?)',
    [username, role, email, password],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to add a new user');
      } else {
        res.status(200).json(results);
      }
    }
  );
});

// app.post('/api/auth/signup')

app.listen(port, (err) => {
  if (err) {
    throw new Error('Something went wrong');
  }
  console.log('all working well');
});
