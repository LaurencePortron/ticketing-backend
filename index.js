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

app.post('/submit-form', (req, res) => {
  const {
    contact_reason,
    message,
    status,
    customer_email,
    priority,
  } = req.body;

  connection.query(
    'INSERT INTO ticket(contact_reason, message, status, customer_email, priority) VALUES (?, ?, ?, ?, ?)',
    [contact_reason, message, status, customer_email, priority],
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
            } else {
              console.log('id successfully added to ticket');
              const type = 'incoming';
              connection.query(
                'INSERT INTO messages (message, type) VALUES (?, ?)',
                [message, type],
                (err, results) => {
                  if (err) {
                    console.log(err);
                  } else {
                    console.log('message created');
                    const messageCustomerId = req.params.customer_id;
                    connection.query(
                      'UPDATE messages m INNER JOIN ticket t ON t.id SET m.ticket_id = t.id WHERE m.message = t.message',
                      [message, ticketCustomerId, messageCustomerId],
                      (err, results) => {
                        if (err) {
                          console.log(err);
                        } else {
                          console.log('ticket_id added to messages');
                          const messageCustomerId = req.params.customer_id;
                          connection.query(
                            'UPDATE messages m INNER JOIN ticket t ON t.customer_id SET m.customer_id = t.customer_id WHERE m.message = t.message',
                            [message, ticketCustomerId, messageCustomerId],
                            (err, results) => {
                              if (err) {
                                console.log(err);
                              } else {
                                console.log('customer_id added to messages');
                                res.status(200).json(results);
                              }
                            }
                          );
                        }
                      }
                    );
                  }
                }
              );
            }
          }
        );
      }
    }
  );
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

app.get('/messages', (req, res) => {
  const allMessages = req.body;
  connection.query(
    'SELECT * FROM messages ORDER BY date ASC',
    [allMessages],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to display all messages');
      } else {
        res.status(200).json(results);
      }
    }
  );
});

// post a message (editor & internal note)

app.post('/message', (req, res) => {
  const { message, ticket_id, customer_id, type } = req.body;
  connection.query(
    'INSERT INTO messages (message, ticket_id, customer_id, type) VALUES (?, ?, ?, ?)',
    [message, ticket_id, customer_id, type],
    (err, results) => {
      if (err) {
        console.log(err);
      } else {
        res.status(200).json(results);
      }
    }
  );
});

// messages of ticket

app.get('/messages/:ticket_id/:customer_id', (req, res) => {
  const ticket_id = req.params.ticket_id;
  const customer_id = req.params.customer_id;

  connection.query(
    'SELECT * FROM messages WHERE ticket_id = ? AND customer_id = ? ORDER BY date ASC',
    [ticket_id, customer_id],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to display this this message');
      } else {
        res.status(200).json(results);
      }
    }
  );
});

//get all templates

app.get('/templates', (req, res) => {
  const { title, macro } = req.body;
  connection.query(
    'SELECT * FROM templates',
    [title, macro],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to display templates');
      } else {
        res.status(200).json(results);
      }
    }
  );
});

//post a template

app.post('/templates', (req, res) => {
  const { title, macro } = req.body;
  connection.query(
    'INSERT INTO templates ( title, macro ) VALUES (?, ?)',
    [title, macro],
    (err, results) => {
      if (err) {
        console.log(err);
      } else {
        res.status(200).json(results);
      }
    }
  );
});

//modify template

app.put('/template/:id', (req, res) => {
  const macro = req.body;
  const templateId = req.params.id;
  connection.query(
    'UPDATE templates SET ? WHERE id = ?',
    [macro, templateId],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to change this template');
      } else {
        res.status(200).json(results);
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

// get one customer

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
              } else {
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
  connection.query(
    'SELECT *  FROM ticket ORDER BY date DESC',
    [allTickets],
    (err, results) => {
      if (err) {
        console.log(err);
        res.status(500).send('An error occurred to display all tickets');
      } else {
        res.status(200).json(results);
      }
    }
  );
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

//get usernames of assignee_id from tickets

//SELECT * FROM users u INNER JOIN ticket t ON t.assignee_id WHERE t.assignee_id = u.id;

app.get('/username/:id', (req, res) => {
  const users = req.body;
  const ticketId = req.params.id;
  connection.query(
    'SELECT * FROM users u INNER JOIN ticket t ON t.assignee_id WHERE t.assignee_id = u.id AND t.id = ?',
    [ticketId, users],
    (err, results) => {
      if (err) {
        console.log(
          'An error occurred to display usernames for ticket assignee_id',
          err
        );
      } else {
        console.log('results', results);
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

// check tickets of assignee
app.get('/tickets/:assignee_id/assignee', (req, res) => {
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
