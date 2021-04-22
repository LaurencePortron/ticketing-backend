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

app.post('/submit-form', (req, res) => {
  const { contact_reason, message, status, customer_email } = req.body;

  connection.query(
    'INSERT INTO ticket(contact_reason, message, status, customer_email) VALUES (?, ?, ?, ?)',
    [contact_reason, message, status, customer_email],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to post ticket');
      } else {
        console.log('ticket posted');

        const addCustomer = req.body;
        const ticketCustomerId = req.params.customer_id;
        const ticketId = req.params.id;
        connection.query(
          'UPDATE ticket t INNER JOIN customers c ON t.customer_email = c.email SET t.customer_id = c.id',
          [addCustomer, ticketCustomerId, ticketId],
          (err, results) => {
            if (err) {
              console.log(err);
              res.status(500).send('An error occurred to add the customer id');
            } else {
              console.log('id successfully added to ticket');
              res.status(200).json(results);
            }
          }
        );
      }
    }
  );
});

//get all customers

app.get('/customers', (req, res) => {
  const allCustomers = req.body;
  connection.query(
    'SELECT * FROM customers',
    [allCustomers],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to display all customers');
      } else {
        res.status(200).json(results);
      }
    }
  );
});

app.get('/customers/:id', (req, res) => {
  const customerId = req.params.id;
  connection.query(
    'SELECT * FROM customers WHERE id = ?',
    [customerId],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to display this customer');
      } else {
        res.status(200).json(results);
      }
    }
  );
});

// add a customer and check if they are in db

app.post('/customers', (req, res) => {
  const { firstname, lastname, email } = req.body;
  if (email) {
    connection.query(
      'SELECT * FROM customers WHERE email = ?',
      [email],
      (err, results) => {
        if (results.length > 0) {
          console.log('customer exists');
        } else {
          connection.query(
            'INSERT INTO customers (firstname, lastname, email) VALUES (?, ?, ?)',
            [firstname, lastname, email],
            (err, results) => {
              if (err) {
                console.log(err);
                // res.status(500).send('An error occurred to post ticket');
              } else {
                // res.status(200).json(results);
                console.log('ticket posted');
              }
            }
          );
        }
      }
    );
  } else {
    res.send('gets created');
    res.end();
  }
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

// get one ticket with customer id
app.get('/ticket/:id/:customer_id', (req, res) => {
  const ticketId = req.params.id;
  const customerId = req.params.customer_id;

  connection.query(
    'SELECT * FROM ticket WHERE id = ? AND customer_id=?',
    [ticketId, customerId],
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

// get all tickets with the same customer id

app.get('/ticket/:customer_id', (req, res) => {
  const customerId = req.params.customer_id;
  connection.query(
    'SELECT * FROM ticket WHERE customer_id = ?',
    [customerId],
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

// get tickets by unassigned status

app.get('/tickets/unassigned', (req, res) => {
  connection.query(
    `SELECT * FROM ticket WHERE assignee_id IS NULL`,
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to display unassigned tickets');
      } else {
        res.status(200).json(results);
      }
    }
  );
});

//change status of ticket

app.put('/ticket/:id/status', (req, res) => {
  const ticketStatus = req.body;
  const ticketId = req.params.id;
  connection.query(
    'UPDATE ticket SET ? WHERE id = ?',
    [ticketStatus, ticketId],
    (err, results) => {
      if (err) {
        console.log(err);
        res
          .status(500)
          .send('An error occurred to change the status of this ticket');
      } else {
        res.status(200).json(results);
      }
    }
  );
});

// change assignee id of ticket
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
