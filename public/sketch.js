let socket, video, poseNet;

let bodies = {}; //from other visitors
let body = {}
let points = [];
let words = "hello this is a dispatch"
let chars = words.split("").reverse();

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
      if (nosePoint.score > 0.6) {
        body = {
          x: nosePoint.position.x / width,
          y: nosePoint.position.y / height,
          points: points
        }

        socket.emit("updateBody", {
          x: body.x,
          y: body.y,
          points: body.points
        });
      }
    }
  });
}

function modelReady() {
  //select("#status").html("Model Loaded");
}


function drawSelf() {
}

function drawOthers() {
  background(150);
  for (const id in bodies) {
    let other = bodies[id];
    drawTrail(other.points);
    //circle(other.x * width, other.y * height, 20);
  }
}

function drawTrail() {
  if (points.length == 0) {
    for (let i = 0; i < 20; i++) {
      points.push({ x: 0, y: 0});
    }
  }

  background(150);
  
  for (let i = 0; i < points.length - 1; i++) {
    points[i] = points[i + 1];
  }
  
  points[points.length - 1] = { x: body.x, y: body.y };
  
  let currChar = 0;
  for (let i = 0; i < points.length; i++) {
    const c = floor(map(i, 0, points.length -1, 255, 100));
    const diameter = floor(map(i, 0, points.length - 1, 10, 50));
    
    noStroke();
    fill(c);
    //ellipse(points[i].x * width, points[i].y * height, diameter, diameter);
    textSize(diameter);
    text(chars[currChar], points[i].x * width, points[i].y * height);
    currChar++;
    if (currChar == chars.length - 1) currChar = 0;
  }
}
