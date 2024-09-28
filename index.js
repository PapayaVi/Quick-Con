const express = require("express");
const session = require('express-session');
const app = express();
const coreJs = require("core-js/stable/object/from-entries");
require("dotenv").config();

const path = require("path");
const bodyParser = require("body-parser");
const axios = require("axios")
const uuid = require('uuid');

const http = require("http");
const server = http.createServer(app);
server.setMaxListeners(15)
const { Server } = require("socket.io");
const io = new Server(server);
const adapter = io.adapter;

const dbConfig = require("./db.config");
const mysql = require("mysql2/promise");
const MySQLStore = require("express-mysql-session")(session);

const $domain = process.env.DEV=='true' ?  process.env.DOMAIN_DEV : process.env.DOMAIN_PROD;

const db = mysql.createPool({
  ...dbConfig,
  namedPlaceholders: true,
});

const cloudinary = require('cloudinary');
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

const sessionStore = new MySQLStore({...dbConfig});

const $fb = {
  redirect:  process.env.DEV=='true' ? process.env.FB_APP_REDIRECT_DEV : process.env.FB_APP_REDIRECT_PROD,
  app_id: process.env.FB_APP_ID,
  app_secret: process.env.FB_APP_SECRET
}

app.use(session({
  secret: 'your-secret-key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 3600000 // 1 hour
  }
}));

const honorifics = ["-san", "-chan", "-kun", "-sensei"];
const cuteWords = [
  "Mochi",
  "Luna",
  "Panda",
  "Mochi",
  "Sunny",
  "Honey",
  "Muffin",
  "Pixie",
  "Lemon",
  "Daisy",
  "Sweetie",
  "Lily",
  "Snooky",
  "Fuzzy",
  "Mochiko",
  "Bibi",
  "Mimi",
  "Lolo",
  "Nana",
  "Floppy",
  "Fluffy",
  "Puffy",
  "Sweetpea",
  "Lovey",
  "Cutie",
  "Munchie",
  "Snugglebug",
  "Cuddlebug",
  "Lovebug",
];
function generateNickname() {
  const randomCuteWord =
    cuteWords[Math.floor(Math.random() * cuteWords.length)];
  const randomHonorific =
    honorifics[Math.floor(Math.random() * honorifics.length)];
  return `${randomCuteWord}${randomHonorific}`;
}
function getCurrentTime() {
  const date = new Date();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12;
  const hours12String = hours12 === 0 ? "12" : hours12.toString();
  const minutesString = minutes.toString().padStart(2, "0");
  return `${hours12String}:${minutesString} ${ampm}`;
}

// Create a table to store chat messages if it doesn't exist
db.execute(
  `
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    );
  `
)
  .then(() => {})
  .catch((err) => {
    console.error("Error creating chat messages table:", err);
  });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "./views"));

app.post('/set-facebook-session', (req, res) => {
  req.session.userId = req.body.facebookId;
  req.session.username = req.body.facebookName;
  console.log("set fb session",req.session.userId)
  res.send('OK');
});
app.post('/set-guest-session', (req, res) => {
  req.session.userId  = uuid.v4();
  req.session.username = generateNickname();
  console.log("set guest session",req.session.userId)

  res.send('OK');
});

app.get("/upload-pic", (req, res) => {
  const file = req.query.file[0]; 
  console.log(file)
  // cloudinary.uploader.upload(file, (result) => {
  //   console.log(result);
  // });
});

app.get('/', (req, res) => {
  console.log("loading home : ",req.session.userId)
  res.render('home', {
    $fb,
    userId: req.session.userId || '',
    username: req.session.username  || '',
    swalFire: req.session.userId ? false : true,
  });
});

app.get('/get-session', (req, res) => {
  const $data = {
    userId: req.session.userId || '',
    username: req.session.username || '',
  }
  res.send($data)
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    } else {
      
      res.redirect('/');
    }
  });
});

const userlist = {};

io.on('connection', (socket) => {

  socket.on('chat message', (data) => {
    io.emit('chat message', data);
    // const $mi = 'INSERT INTO chat_messages (message, userId, username) VALUES (?, ?, ?)';
    // const $mi_values = [data.message, data.userId, data.username];
    // db.execute($mi, $mi_values)
    // .then(() => {
    //   io.emit('chat message', data);
    // })
    // .catch((err) => {
    //   console.error('Error storing message in database:', err);
    // });
  });

  socket.on('remove-participant', (id) => {
    io.emit('remove-participant', id);
  });

  socket.on('update-participants-list', () => {
    io.emit('update-participants-list', userlist);
  });

  // socket.on('get-messages',() =>{
  //   const $ms = "SELECT message,DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+08:00'), '%h:%i %p') AS time, userId, username FROM chat_messages ORDER BY created_at ASC";
  //   db.execute($ms)
  //     .then((results) => {
  //       const messages = results[0];
  //       socket.emit('update-messages', messages);
  //     })
  //     .catch((err) => {
  //       console.error('Error retrieving messages from database:', err);
  //     });
  // })

  socket.on('save-socket', (data) => {
    socket.userId = data.userId
    socket.username = data.username
    const userId = data.userId;
    const username = data.username;
    userlist[userId] = { username };
    io.emit('update-participants-list', userlist);
  });

  socket.on('disconnect', () => {
    const userId = socket.userId;
    if (userId in userlist) {
      delete userlist[userId];
      io.emit("remove-participant", userId);
    }
    // if (Object.keys(userlist).length === 0) {
    //   const $md = "TRUNCATE TABLE chat_messages;";
    //   db.execute($md)
    //     .then(() => {
    //       console.log("cleared messages")
    //     })
    //     .catch((err) => {
    //       console.error('Error retrieving messages from database:', err);
    //     });
    // }
  });
});

server.listen(3000, () => {
  console.log(
    `Server is now live at --- \u001b[1;32m ${$domain}`
  );
});
