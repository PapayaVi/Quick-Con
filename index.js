const express = require('express');
const app = express()
const coreJs = require('core-js/stable/object/from-entries');
require('dotenv').config()

const path = require("path");
const bodyParser = require("body-parser");

const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const adapter = io.adapter;

const dbConfig = require('./db.config');
const mysql = require('mysql2/promise');

const db = mysql.createPool({
        ...dbConfig,
        namedPlaceholders: true,
});

const { fakerJA }= require('@faker-js/faker');
const honorifics = ['-san', '-chan', '-kun', '-sensei'];
const cuteWords = [
        'Mochi',
        'Luna',
        'Panda',
        'Mochi',
        'Sunny',
        'Honey',
        'Muffin',
        'Pixie',
        'Lemon',
        'Daisy',
        'Sweetie',
        'Lily',
        'Snooky',
        'Fuzzy',
        'Mochiko',
        'Bibi',
        'Mimi',
        'Lolo',
        'Nana',
        'Floppy',
        'Fluffy',
        'Puffy',
        'Sweetpea',
        'Lovey',
        'Cutie',
        'Munchie',
        'Snugglebug',
        'Cuddlebug',
        'Lovebug'

];
function generateNickname(a) {
        const randomCuteWord = cuteWords[Math.floor(Math.random() * cuteWords.length)];
        const randomHonorific = honorifics[Math.floor(Math.random() * honorifics.length)];
        return `${randomCuteWord}${randomHonorific}`;
}
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

// Create a table to store chat messages if it doesn't exist
db.execute(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id INT AUTO_INCREMENT,
          message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        );
      `).then(() => {
        
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
        socket.setMaxListeners(30);
    
        // Load previous messages from the database
        db.execute("SELECT message,DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+08:00'), '%h:%i %p') AS time, temp_user AS user,type FROM chat_messages WHERE type='sent' ORDER BY created_at ASC").then(([results, fields]) => {
                results.forEach((res_obj) => {
                        socket.emit('chat message', {message : res_obj.message, time : res_obj.time, user : res_obj.user, type : res_obj.type});
                });
                
        }).catch((err) => {
                console.error('Error loading previous messages:', err);
        });

        socket.username = generateNickname(adapter.participants);
        socket.emit('user_connect', socket.username)
        adapter.participants = adapter.participants || [];
        adapter.participants.push(socket.username);

        
        

        socket.on('add_participant', () => {
                io.emit('participant_connect', adapter.participants)
        });

        socket.on('disconnect', () => {
                let index = adapter.participants.indexOf(socket.username);
                if (index !== -1) {
                        adapter.participants.splice(index, 1);
                }
                const msg = `${socket.username} has left...`;
                io.emit('user_disconnect', {message: msg, time: getCurrentTime(), user: socket.username });
                if(adapter.participants.length === 0){ // might need to change this
                        db.execute('truncate table chat_messages').then((result) => {
                               
                        })
                        .catch((err) => {
                                console.error('Error saving message:', err);
                        });
                }
        });
        
                
        socket.on('chat message', (msg) => {
                db.execute('INSERT INTO chat_messages (temp_user, message, type) VALUES (:temp_user, :message, :type)', { 
                        temp_user: socket.username, 
                        message: msg,
                        type: 'sent' 
                }).then((result) => {
                        const insertedId = result[0].insertId;
                
                        db.execute("SELECT message,DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+08:00'), '%h:%i %p') AS time,temp_user AS user,type FROM chat_messages WHERE id = ?", [insertedId])
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

        

        //----------------- Fun
        io.on('playSound', (audio) => {
                io.emit('playSound', audio);
        });
        io.on('stopSound', () => {
                io.emit('stopSound');
        });

        socket.on('soundboardStart', (audioSrc) => {
                io.emit('playSound', audioSrc);
        });
        socket.on('soundboardStop', () => {
                io.emit('stopSound');
        });

        socket.on("connect_error", (err) => {
                console.log(err.message); // the reason of the error, for example "xhr poll error"
                console.log(err.description); // some additional description, for example the status code of the initial HTTP response
                console.log(err.context); // some additional context, for example the XMLHttpRequest object
              });
});

app.get('/test', (req, res) => {
        res.render('home2');
});

// Set up Socket.IO to handle connections and events


server.listen(3000, () => {
        console.log('Server is now live at --- \u001b[1;32m http://localhost:'+port);
});