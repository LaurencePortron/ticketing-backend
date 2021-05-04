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
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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

// submit ticket: 1. add ticket into ticket table, 2. add customer_id from ticket table to customers table 3. add ticket to message table 4. update ticket_id in message table where messages are the same 5. update customer_id in message table where messages are the same

// async function for all routes

async function executeQuery(query, values) {
  return new Promise((resolve, reject) => {
    connection.query(query, values, (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

app.post('/submit-form', async (req, res) => {
  const {
    contact_reason,
    message,
    status,
    customer_email,
    priority,
  } = req.body;

  const addCustomer = req.body;
  const ticketCustomerId = req.params.customer_id;
  const messageCustomerId = req.params.customer_id;
  const ticketId = req.params.id;

  const type = 'incoming';

  try {
    await executeQuery(
      'INSERT INTO ticket(contact_reason, message, status, customer_email, priority) VALUES (?, ?, ?, ?, ?)',
      [contact_reason, message, status, customer_email, priority]
    );
    console.log('ticket posted');

    await executeQuery(
      'UPDATE ticket t INNER JOIN customers c ON t.customer_email = c.email SET t.customer_id = c.id',
      [addCustomer, ticketCustomerId, ticketId]
    );
    console.log('message created');

    await executeQuery('INSERT INTO messages (message, type) VALUES (?, ?)', [
      message,
      type,
    ]);
    console.log('message created');

    await executeQuery(
      'UPDATE messages m INNER JOIN ticket t ON t.id SET m.ticket_id = t.id WHERE m.message = t.message',
      [message, ticketCustomerId, messageCustomerId]
    );
    console.log('ticket_id added to messages');

    const results = await executeQuery(
      'UPDATE messages m INNER JOIN ticket t ON t.customer_id SET m.customer_id = t.customer_id WHERE m.message = t.message',
      [message, ticketCustomerId, messageCustomerId]
    );

    console.log('customer_id added to messages');
    res.send(results);
  } catch (error) {
    console.log(error);
    res.status(500).send('An error occurred to post ticket');
  }
});

// send reply to customer

app.post('/send-reply/:id', (req, res) => {
  const ticketId = req.params.id;
  const reply = {
    to: req.body.to,
    from: 'lauren.ticketing@gmail.com',
    subject: `Your response to your ticket: ${ticketId}`,
    text: req.body.text,
  };
  sgMail
    .send(reply)
    .then(() => {
      console.log('Email sent');
      res.send({ ok: true });
    })
    .catch((error) => {
      console.error('sth went wrong', error.response.body.errors);
      res.status(500).send('bad gateway');
    });
});

//get all messages

app.get('/messages', async (req, res) => {
  const allMessages = req.body;
  try {
    const results = await executeQuery(
      'SELECT * FROM messages ORDER BY date ASC',
      [allMessages]
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to display all messages');
  }
});

// post a message (editor & internal note)

app.post('/message', async (req, res) => {
  const { message, ticket_id, customer_id, type } = req.body;
  try {
    const results = await executeQuery(
      'INSERT INTO messages (message, ticket_id, customer_id, type) VALUES (?, ?, ?, ?)',
      [message, ticket_id, customer_id, type]
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to post this message');
  }
});

// get messages of a ticket(conversation)

app.get('/messages/:ticket_id/:customer_id', async (req, res) => {
  const ticket_id = req.params.ticket_id;
  const customer_id = req.params.customer_id;
  try {
    const results = await executeQuery(
      'SELECT * FROM messages WHERE ticket_id = ? AND customer_id = ? ORDER BY date ASC',
      [ticket_id, customer_id]
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to display this this message');
  }
});

//get all templates

app.get('/templates', async (req, res) => {
  const { title, macro } = req.body;
  try {
    const results = await executeQuery('SELECT * FROM templates', [
      title,
      macro,
    ]);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to display templates');
  }
});

//post a template

app.post('/templates', async (req, res) => {
  const { title, macro } = req.body;
  try {
    const results = await executeQuery(
      'INSERT INTO templates ( title, macro ) VALUES (?, ?)',
      [title, macro]
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to post this template');
  }
});

//modify template

app.put('/template/:id', async (req, res) => {
  const macro = req.body;
  const templateId = req.params.id;
  try {
    const results = await executeQuery('UPDATE templates SET ? WHERE id = ?', [
      macro,
      templateId,
    ]);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to change this template');
  }
});

//get all customers

app.get('/customers', async (req, res) => {
  const allCustomers = req.body;

  try {
    const results = await executeQuery('SELECT * FROM customers', [
      allCustomers,
    ]);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to display all customers');
  }
});

// get one customer

app.get('/customers/:id', async (req, res) => {
  const customerId = req.params.id;
  try {
    const results = await executeQuery('SELECT * FROM customers WHERE id = ?', [
      customerId,
    ]);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to display this customer');
  }
});

// add a customer and check if they are in db

app.post('/customers', async (req, res) => {
  const { firstname, lastname, email } = req.body;
  if (email) {
    try {
      const customerResults = await executeQuery(
        'SELECT * FROM customers WHERE email = ?',
        [email]
      );
      if (customerResults.length > 0) {
        console.log('customer exists');
      } else {
        const results = await executeQuery(
          'INSERT INTO customers (firstname, lastname, email) VALUES (?, ?, ?)',
          [firstname, lastname, email]
        );
        console.log('customer added');
        res.send(results);
      }
    } catch (error) {
      console.log(error);
      res.status(500).send('An error occurred to post ticket');
    }
  }
});

// check if this works

//display all tickets by date DESC

app.get('/tickets', async (req, res) => {
  const allTickets = req.body;
  try {
    const results = await executeQuery(
      'SELECT *  FROM ticket ORDER BY date DESC',
      [allTickets]
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to display all tickets');
  }
});

// get one ticket with customer id

app.get('/ticket/:id/:customer_id', async (req, res) => {
  const ticketId = req.params.id;
  const customerId = req.params.customer_id;
  try {
    const results = await executeQuery(
      'SELECT * FROM ticket WHERE id = ? AND customer_id=?',
      [ticketId, customerId]
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to display the selected ticket');
  }
});

// get all tickets with the same customer id

app.get('/ticket/:customer_id', async (req, res) => {
  const customerId = req.params.customer_id;
  try {
    const results = await executeQuery(
      'SELECT * FROM ticket WHERE customer_id = ?',
      [customerId]
    );
    res.status(200).json(results);
  } catch (error) {
    res
      .status(500)
      .send(
        'An error occurred to display the tickets with the same customer_id'
      );
  }
});

//get tickets by closed status

app.get('/tickets/closed', async (req, res) => {
  const ticketStatus = req.params.status;
  try {
    const results = await executeQuery(
      `SELECT * FROM ticket WHERE status LIKE '%closed%'`,
      [ticketStatus]
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to display the closed tickets');
  }
});

// get tickets by open status

app.get('/tickets/open', async (req, res) => {
  const ticketStatus = req.params.status;
  try {
    const results = await executeQuery(
      `SELECT * FROM ticket WHERE status LIKE '%open%'`,
      [ticketStatus]
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to display the closed tickets');
  }
});

// get tickets by pending status

app.get('/tickets/pending', async (req, res) => {
  const ticketStatus = req.params.status;
  try {
    const results = await executeQuery(
      `SELECT * FROM ticket WHERE status LIKE '%pending%'`,
      [ticketStatus]
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to display the pending tickets');
  }
});

// get tickets by unassigned status

app.get('/tickets/unassigned', async (req, res) => {
  try {
    const results = await executeQuery(
      `SELECT * FROM ticket WHERE assignee_id IS NULL`
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to display unassigned tickets');
  }
});

//change status of ticket

app.put('/ticket/:id/status', async (req, res) => {
  const ticketStatus = req.body;
  const ticketId = req.params.id;

  try {
    const results = await executeQuery('UPDATE ticket SET ? WHERE id = ?', [
      ticketStatus,
      ticketId,
    ]);
    res.status(200).json(results);
  } catch (error) {
    res
      .status(500)
      .send('An error occurred to change the status of this ticket');
  }
});

//get usernames of assignee_id from tickets

//SELECT * FROM users u INNER JOIN ticket t ON t.assignee_id WHERE t.assignee_id = u.id;

app.get('/username/:id', async (req, res) => {
  const users = req.body;
  const ticketId = req.params.id;

  try {
    const results = await executeQuery(
      'SELECT * FROM users u INNER JOIN ticket t ON t.assignee_id WHERE t.assignee_id = u.id AND t.id = ?'[
        (ticketId, users)
      ]
    );
    res.status(200).json(results);
  } catch (error) {
    res
      .status(500)
      .send('An error occurred to display usernames for ticket assignee_id');
  }
});

// change assignee id of ticket
app.put('/ticket/:id/', async (req, res) => {
  const newAssignee = req.body;
  const ticketId = req.params.id;
  try {
    const results = await executeQuery('UPDATE ticket SET ? WHERE id = ?', [
      newAssignee,
      ticketId,
    ]);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to change the new assignee');
  }
});

// check tickets of assignee
app.get('/tickets/:assignee_id/assignee', async (req, res) => {
  const assigneeId = req.params.assignee_id;
  try {
    const results = await executeQuery(
      'SELECT * FROM ticket WHERE assignee_id = ?',
      [assigneeId]
    );
    res.status(200).json(results);
  } catch (error) {
    res
      .status(500)
      .send('An error occurred to display the selected ticket and assignee');
  }
});

// get all users
app.get('/users', async (req, res) => {
  const users = req.body;
  try {
    const results = await executeQuery('SELECT * FROM users', [users]);
    res.status(200).json(results);
  } catch (error) {
    res
      .status(500)
      .send('An error occurred to display the selected ticket and assignee');
  }
});

// get one user
app.get('/users/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const results = await executeQuery('SELECT * FROM users WHERE id = ?', [
      userId,
    ]);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to display the selected user');
  }
});

// delete one user
app.delete('/users/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const results = await executeQuery('DELETE FROM users WHERE id = ?', [
      userId,
    ]);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to delete this user');
  }
});

//
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/LogIn.js'));
});

//add a user

app.post('/users', async (req, res) => {
  const { username, role, email, password } = req.body;
  try {
    const results = await executeQuery(
      'INSERT INTO users (username, role, email, password) VALUES (?, ?, ?, ?)',
      [username, role, email, password]
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to add a new user');
  }
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

app.get('/logged-user', async (req, res) => {
  const username = req.session.username;
  try {
    const results = await executeQuery(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    res.status(200).json(results);
  } catch (error) {
    res.status(500).send('An error occurred to display the logged in user');
  }
});

app.listen(port, (err) => {
  if (err) {
    throw new Error('Something went wrong');
  }
  console.log('all working well');
});
