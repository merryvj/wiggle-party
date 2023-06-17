const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const port = 3000;

const app = express();
const server = http.createServer(app);
const io = new socketio.Server(server);

// uses static site from /public
app.use(express.static("public"));

let number;
let timesUpdated = 0


function dothething() {
  timesUpdated += 1
  io.sockets.emit("update", number);
  console.clear()
  console.log("updated.. [" + timesUpdated + "]")
}

setInterval(function() {
  number = timesUpdated
}, 1)

setInterval(function() {
  dothething()
}, 1000)

io.on("connect", function(socket) {
  dothething()
})


server.listen(port, function() {
  console.clear()
  console.log("🟢 " + port);
});

let posi = []

io.on("move", function(pos) {
  posi.push(pos)
  io.emit("sus", posi)
  for (let i = 0; i < posi.length; i++) {
    posi.splice(i, 1)
  }
})