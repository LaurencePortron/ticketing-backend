const express = require('express');
const connection = require('./db');
var session = require('express-session');

const port = 5000;
const app = express();
const cors = require('cors');

app.set('trust proxy', 1);
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

app.use(
  cors({
    origin: (origin, callback) => {
      if (origin === undefined || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
    cookie: { httpOnly: false, secure: false, maxAge: null },
  })
);

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
        res.status(200).json(results);
      }
    }
  );
});

//display alltickets

app.get('/tickets', (req, res) => {
  const allTickets = req.body;
  connection.query('SELECT * FROM ticket', [allTickets], (err, results) => {
    if (err) {
      console.log(err);
      res.status(500).send('An error occurred to display all tickets');
    } else {
      res.status(200).json(results);
    }
  });
});

// get one ticket
app.get('/ticket/:id', (req, res) => {
  const ticketId = req.params.id;
  connection.query(
    'SELECT * FROM ticket WHERE id = ?',
    [ticketId],
    (err, results) => {
      if (err) {
        console.log(err);
        res
          .status(500)
          .send('An error occurred to display the selected ticket');
      } else {
        console.log('results', results);
        res.status(200).json(results);
      }
    }
  );
});

//get tickets by closed status

app.get('/tickets/closed', (req, res) => {
  const ticketStatus = req.params.status;
  connection.query(
    `SELECT * FROM ticket WHERE status LIKE '%closed%'`,
    [ticketStatus],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to display the closed tickets');
      } else {
        console.log('results', results);
        res.status(200).json(results);
      }
    }
  );
});

// get tickets by open status

app.get('/tickets/open', (req, res) => {
  const ticketStatus = req.params.status;
  connection.query(
    `SELECT * FROM ticket WHERE status LIKE '%open%'`,
    [ticketStatus],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to display the closed tickets');
      } else {
        console.log('results', results);
        res.status(200).json(results);
      }
    }
  );
});

// get tickets by pending status

app.get('/tickets/pending', (req, res) => {
  const ticketStatus = req.params.status;
  connection.query(
    `SELECT * FROM ticket WHERE status LIKE '%pending%'`,
    [ticketStatus],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to display the closed tickets');
      } else {
        console.log('results', results);
        res.status(200).json(results);
      }
    }
  );
});

// modify assignee id of ticket
app.put('/ticket/:id/', (req, res) => {
  const newAssignee = req.body;
  const ticketId = req.params.id;
  connection.query(
    'UPDATE ticket SET ? WHERE id = ?',
    [newAssignee, ticketId],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to change the new assignee');
      } else {
        res.status(200).json(results);
      }
    }
  );
});

// check assignee of one ticket
app.get('/ticket/:assignee_id/assignee', (req, res) => {
  const assigneeId = req.params.assignee_id;
  connection.query(
    'SELECT * FROM ticket WHERE assignee_id = ?',

    [assigneeId],
    (err, results) => {
      if (err) {
        console.log(err);
        res
          .status(500)
          .send(
            'An error occurred to display the selected ticket and assignee'
          );
      } else {
        console.log('results', results);
        res.status(200).json(results);
      }
    }
  );
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

// delete one user
app.delete('/users/:id', (req, res) => {
  const userId = req.params.id;
  connection.query(
    'DELETE FROM users WHERE id = ?',
    [userId],
    (err, results) => {
      if (err) {
        res.status(500).send('An error occurred to delete this user');
      } else {
        res.status(200).json(results);
      }
    }
  );
});

//
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/LogIn.js'));
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

// check for existing user in DB
app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  if (username && password) {
    connection.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password],
      (err, results) => {
        if (results.length > 0) {
          req.session.loggedin = true;
          req.session.username = username;
        } else {
          res.status(401);
          res.send('Incorrect username or password');
        }
        res.end();
      }
    );
  } else {
    res.send('Please enter username and password');
    res.end();
  }
});

// if details are correct the user will be redirected to the dashboard
app.get('/dashboard', (req, res) => {
  if (req.session.loggedin) {
    res.send('Welcome back, ' + req.session.username + '!');
  } else {
    res.send('Please login to view this page!');
  }
  res.end();
});

// current logged in user

app.get('/logged-user', (req, res) => {
  const username = req.session.username;
  connection.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
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

app.listen(port, (err) => {
  if (err) {
    throw new Error('Something went wrong');
  }
  console.log('all working well');
});
