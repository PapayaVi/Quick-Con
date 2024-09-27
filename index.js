const express = require("express");
const session = require('express-session');
const app = express();
const coreJs = require("core-js/stable/object/from-entries");
require("dotenv").config();

const path = require("path");
const bodyParser = require("body-parser");
const axios = require("axios")

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
  console.log("setting facebook session");
  req.session.facebookId = req.body.facebookId;
  req.session.facebookName = req.body.facebookName;
  console.log(req.session)
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
  res.render('home', {
    $fb,
    facebookId: req.session.facebookId || '',
    facebookName: req.session.facebookName  || '',
    swalFire: req.session.facebookId ? false : true,
    username: req.session.facebookName   || ''
  });
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


let participants = [];

io.on('connection', (socket) => {

  

  socket.on('chat message', (data) => {
    const message_data = {
      id : data.userId,
      username : data.username,
      message : data.message,
      time : getCurrentTime()
    }
    io.emit('chat message', message_data);
  });

  socket.on('participant-connect', (data) => {
    // const session = socket.handshake.session;
    // console.log(session.facebookId)
    participants.push(data);
    socket.userId = data.userId
    socket.username = data.username
    io.emit('participant-connect', participants);
  });

  socket.on('request-participant-list', () => {
    io.emit('update-participant-list', participants);
  });

  socket.on('disconnect', () => {
    const index = participants.findIndex((participant) => participant.userId === socket.userId);
    if (index !== -1) {
      participants.splice(index, 1);
    }
    io.emit('participant-connect', participants);
  });
});

server.listen(3000, () => {
  console.log(
    `Server is now live at --- \u001b[1;32m ${$domain}`
  );
});
