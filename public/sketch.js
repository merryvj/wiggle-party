let socket, video, poseNet;

let bodies = {}; //from other visitors
let body = {}

function setup() {
  //setup socket
  setupSocket();

  //setup canvas
  createCanvas(window.innerWidth, window.innerHeight);
  background(150);

  //start video capture
  video = createCapture(VIDEO);
  video.size(width, height);

  //setup pose detection
  setupModel();

  video.hide();
}

function draw() {
  drawSelf();
  drawOthers();
}

function setupSocket() {
  socket = io();
  socket.on("bodies", (data) => {
    bodies = data;
  });
}

function setupModel() {
  let options = {
    // imageScaleFactor: 0.3,
    // outputStride: 16,
    flipHorizontal: true,
    // minConfidence: 0.5,
    maxPoseDetections: 1, //detect only single pose
    // scoreThreshold: 0.5,
    // nmsRadius: 20,
    detectionType: "single", //detect only single pose
    // multiplier: 0.75,
  };
  poseNet = new ml5.poseNet(video, options, () => {
    
  });

  poseNet.on("pose", (results) => {
    let check = results[0].pose.score;
    if (check) {
      let nosePoint = results[0].pose.keypoints[0];
      if (nosePoint.score > 0.85) {
        body = {
          x: nosePoint.position.x / width,
          y: nosePoint.position.y / height,
        }

        socket.emit("updateBody", {
          x: body.x,
          y: body.y
        });
      }
    }
  });
}

function modelReady() {
  //select("#status").html("Model Loaded");
}


function drawSelf() {
  image(video, 0, 0, width, height);
}

function drawOthers() {
  background(150);
  for (const id in bodies) {
    let other = bodies[id];
    circle(other.x * width, other.y * height, 20);
  }
}

