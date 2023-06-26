
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
    x: 0,
    y: 0,
    points: [],
    chars:[],
    synth: null,
    size: 0.02,
  }

  socket.on('updateBody', (data) => {
    bodies[socket.id].x = data.x;
    bodies[socket.id].y = data.y;
    bodies[socket.id].points = data.points;
    bodies[socket.id].chars = data.chars;
    bodies[socket.id].synth = data.synth;
    bodies[socket.id].size = data.size;
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

const frameRate = 30;
setInterval(() => {
  io.emit("bodies", bodies);
}, 1000 / frameRate);

