let socket, video, poseNet, speechMic;

let bodies = {}; //from other visitors
let body = {}
let points = [];
let isLoaded = false;

function setup() {
  //setup socket
  setupSocket();
  
  //setupMic
  setupMic();

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
  background(150);

  if(!isLoaded) {
    fill(80);
    textSize(42);
    textAlign(CENTER);
    text("Listening for words...", width/2, height/2);
  }
  
  drawOthers();
}

function setupSocket() {
  socket = io();
  socket.on("bodies", (data) => {
    bodies = data;
    
  });
}

function setupMic() {
  let lang = navigator.language || 'en-US';
  speechMic = new p5.SpeechRec(lang, gotSpeech);
  speechMic.start();

  function gotSpeech() {
    console.log("hi");
    body.chars = speechMic.resultString.split("").reverse();
    isLoaded = true;
  }
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
          points: points,
          chars: body.chars,
        }

        socket.emit("updateBody", {
          x: body.x,
          y: body.y,
          points: body.points,
          chars: body.chars
        });

      }
    }
  });
}

function modelReady() {
  //select("#status").html("Model Loaded");
}


function drawOthers() {
  for (const id in bodies) {
    let other = bodies[id];
    drawTrail(other.points);
  }
}

function drawTrail() {
  if (!isLoaded) return;
  if (points.length == 0) {
    for (let i = 0; i < body.chars.length; i++) {
      points.push({ x: 0, y: 0});
    }
  }

  
  for (let i = 0; i < points.length - 1; i++) {
    points[i] = points[i + 1];
  }
  
  let currChar = 0;
  points[points.length - 1] = { x: body.x, y: body.y };

  for (let i = 0; i < points.length; i++) {
    const c = floor(map(i, 0, points.length -1, 255, 100));
    const diameter = floor(map(i, 0, points.length - 1, 30, 50));
    
    noStroke();
    fill(c);
    //ellipse(points[i].x * width, points[i].y * height, diameter, diameter);
    textSize(diameter);
    text(body.chars[currChar], points[i].x * width, points[i].y* height);
    currChar++; 
  }
}
