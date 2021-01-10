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

// enable CORS

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

app.get('/', (req, res) => {
  res.send('Welcome to ticketing backend!');
});

// post data to ticket table

app.post('/submit-form', (req, res) => {
  const { contact_reason, message } = req.body;
  connection.query(
    'INSERT INTO ticket(contact_reason, message) VALUES (?, ?)',
    [contact_reason, message],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to display ticket');
      } else {
        console.log(results);
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
      console.log(results);
      res.status(200).json(results);
    }
  });
});

app.listen(port, (err) => {
  if (err) {
    throw new Error('Something went wrong');
  }
  console.log('all working well');
});
