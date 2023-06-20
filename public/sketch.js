let socket, video, poseNet, speechMic;

let bodies = {}; //from other visitors
let body = {
  x: 0,
  y: 0,
  points: [],
  chars: []
}
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
  

  if(isLoaded) {
    if(body.points.length == 0) {
      for (let i = 0; i < body.chars.length; i++) {
        body.points.push({ x: 0, y: 0});
      }
    }

    for (let i = 0; i < body.points.length - 1; i++) {
      body.points[i] = body.points[i + 1];
    }
    body.points[body.points.length - 1] = { x: body.x, y: body.y };

    drawOthers();
  }
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
  //speechMic.continuous = true;
  speechMic.start();
  body.chars = [];

  function gotSpeech() {
    let detected = speechMic.resultString.split("").reverse();
    if(detected.length == 0) return;
    body.chars = detected;
    //body.chars = speechMic.resultString.split(" ");
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
          points: body.points,
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
  for (let id in bodies) {
    drawTrail(bodies[id]);
  }
}

function drawTrail(b) {

  let currChar = 0;
 
  for (let i = 0; i < b.points.length; i++) {
    const c = floor(map(i, 0, b.points.length -1, 255, 100));
    const diameter = floor(map(i, 0, b.points.length - 1, 30, 50));
    
    noStroke();
    fill(c);
    //ellipse(points[i].x * width, points[i].y * height, diameter, diameter);
    textSize(diameter);
    text(b.chars[currChar], (b.points[i].x - i*0.03) * width, b.points[i].y* height);
    currChar++; 
  }

}
