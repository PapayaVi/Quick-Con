const express = require('express');
const app = express()

require('dotenv').config()

const path = require("path");
const bodyParser = require("body-parser");

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const dbConfig = require('./db.config');
const mysql = require('mysql2/promise');

const db = mysql.createPool({
        ...dbConfig,
        namedPlaceholders: true,
      });

// Create a table to store chat messages if it doesn't exist
db.execute(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id INT AUTO_INCREMENT,
          message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        );
      `).then(() => {
        console.log('Chat messages table created');
      }).catch((err) => {
        console.error('Error creating chat messages table:', err);
      });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static('public'));

app.set("view engine", "ejs",);
app.set("views", path.join(__dirname,'./views'));

const port = process.env.PORT;

app.get('/', (req, res) => {  
        res.render("home");
});

io.on('connection', (socket) => {
        // Load previous messages from the database
        db.execute("SELECT message,DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+08:00'), '%h:%i %p') AS time FROM chat_messages ORDER BY created_at ASC").then(([results, fields]) => {
                results.forEach((res_obj) => {
                        socket.emit('chat message', {message : res_obj.message, time : res_obj.time} );
                });
        }).catch((err) => {
                console.error('Error loading previous messages:', err);
        });

        socket.on('disconnect', () => {
                function getCurrentTime() {
                        const date = new Date();
                        const hours = date.getHours();
                        const minutes = date.getMinutes();
                        const ampm = hours >= 12 ? 'PM' : 'AM';
                        const hours12 = hours % 12;
                        const hours12String = hours12 === 0 ? '12' : hours12.toString();
                        const minutesString = minutes.toString().padStart(2, '0');
                        return `${hours12String}:${minutesString} ${ampm}`;
                      }
                io.emit('dc', {message: 'user has left...', time: getCurrentTime()});;
        });

        socket.on('chat message', (msg) => {
                // Save the message to the database
                db.execute('INSERT INTO chat_messages (message) VALUES (:message)', { message: msg })
                .then((result) => {
                const insertedId = result[0].insertId;
               
                        db.execute("SELECT message,DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+08:00'), '%h:%i %p') AS time FROM chat_messages WHERE id = ?", [insertedId])
                        .then((rows) => {
                                const insertedData = rows[0];
                                io.emit('chat message', insertedData[0]);
                        })
                        .catch((err) => {
                                console.error('Error fetching inserted data:', err);
                        });
                })
                .catch((err) => {
                console.error('Error saving message:', err);
                });
        });

        socket.on("connect_error", (err) => {
                console.log(err.message); // the reason of the error, for example "xhr poll error"
                console.log(err.description); // some additional description, for example the status code of the initial HTTP response
                console.log(err.context); // some additional context, for example the XMLHttpRequest object
              });
});

server.listen(3000, () => {
        console.log('Server is now live at --- \u001b[1;32m http://localhost:'+port);
});