
// Import required modules
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// Create an Express app
const app = express();
const server = http.createServer(app);

// Create a Socket.io instance
const io = socketIO(server);

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.render("index.html");
});

let bodies = {};
// Define a connection event for Socket.io
io.on('connection', (socket) => {
  console.log('A user connected');
  bodies[socket.id] = {
    x: 0.5,
    y: 0.5,
    points: [],
    chars:[],
    synth: null,
    size: 0.02,
    sentiment: 0.5,
  }

  socket.on('updateBody', (data) => {
    bodies[socket.id] = data;
    
  })
  
  // Handle a disconnect event
  socket.on('disconnect', () => {
    delete bodies[socket.id];
    console.log('A user disconnected');
  });
});

// Start the server
const port = 4000;
server.listen(port, () => {
  console.log(`Server running on https://localhost:${port}`);
});

const frameRate = 1;
setInterval(() => {
  io.emit("bodies", bodies);
}, 100);

