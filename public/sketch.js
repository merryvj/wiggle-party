let socket, video, poseNet, speechMic, ambientMic, speaker, synth;
let bgShader, bgBuffer;
let instructions = "speak? or move?";


let bodies = {}; //from other visitors
let body = {
  x: 0,
  y: 0,
  prev: {
    x: 0,
    y: 0
  },
  points: [],
  chars: [],
  synth: null,
  size: 0.04,
  sentiment: 0.5,
}

let prevBodies = {body};

let prevX = 0, prevY = 0;

let notes = ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4']

let isLoaded = false;

function preload() {
  bgShader = loadShader('bg.vert', 'bg.frag');
}

function setup() {
  setupSocket();
  setupMic();

  //setup canvas
  createCanvas(window.innerWidth, window.innerHeight);
  bgBuffer = createGraphics(window.innerWidth, window.innerHeight, WEBGL);
  bgBuffer.bgShader = bgShader;

  //start video capture
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  //set up synth
  synth = new p5.MonoSynth();
  synth.triggerAttack();
  synth.amp(0, 0);

  setupModel();

}


function draw() {
  background(0);
  if(isLoaded) {
    console.log(body.points.length, body.chars.length);
    if(body.points.length == 0) {
      for (let i = 0; i < body.chars.length; i++) {
        body.points.push({ x: 0, y: 0});
      }
    } else if (body.points.length < body.chars.length) {

      for (let i = body.points.length - 1; i < body.chars.length; i++){
        body.points.push({ x: 0, y: 0});
      }
    } else if (body.points.length > body.chars.length) {
      for (let i = body.points.length - 1; i > body.chars.length - 1; i--) {
        body.points.pop();
      }
    }

    for (let i = 0; i < body.points.length - 1; i++) {
      body.points[i] = body.points[i + 1];
    }
    body.points[body.points.length - 1] = { x: body.x, y: body.y };

  
   
    drawShader();
    drawOthers();
  }
  drawText();
}

function drawText() {
  
  push();
  fill(150);
  textSize(24);
  textAlign(CENTER);
  if (!isLoaded) {
    text("please allow webcam and video access <3", width/2, height/2)
  } else {
    text(instructions, width/2, height-50);
  }
  if (body.chars.length > 0) {
    instructions = "";
  }
  pop();
}

let pointNum;

function drawShader() {
  bgBuffer.clear();
  bgBuffer.reset();
  bgBuffer.push();
  bgBuffer.shader(bgShader);
  bgBuffer.bgShader.setUniform("u_resolution", [width, height]);
  bgBuffer.bgShader.setUniform("u_time", millis() / 1000.0);
  
  pointNum = 1;
  for (let id in bodies) {
    let b = bodies[id];
    bgBuffer.bgShader.setUniform(`point${pointNum}`, [b.x, map(b.y, 0, 1, 1, 0)]);
    bgBuffer.bgShader.setUniform(`radius${pointNum}`, b.size);

    pointNum++;
  }

  bgBuffer.rectMode(CENTER);
  bgBuffer.rect(0,0,100,200);
  bgBuffer.rect(200,300,100,100);
  bgBuffer.pop();
  clear();
  push();
  image(bgBuffer, 0, 0);
  pop();
}

function setupSocket() {
  socket = io();
  socket.on("bodies", (data) => {
    prevBodies = bodies;
    bodies = data;
    setTimeout(() => {
      isLoaded = true;
  }, 5000)
    
  });
}

function setupMic() {
  ambientMic = new p5.AudioIn();
  ambientMic.start();

  let lang = navigator.language || 'en-US';
  speechMic = new p5.SpeechRec(lang, gotSpeech);
  speechMic.continuous = true;
  speechMic.start();
  body.chars = [];

  function gotSpeech() {
    let detected = speechMic.resultString.split("");
    if(detected.length == 0) return;
    body.chars = detected;
    let text = speechMic.resultString;
    body.sentiment = sentiment.predict(text).score;


    // setTimeout(() => {
    //   body.chars = "";
    // }, 1000 + 500 * body.chars.length)
  }

  setInterval(() => {
    speechMic.start()
  }, 10000)
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
    processBody(results);
  })

  sentiment = ml5.sentiment('movieReviews', modelReady);

  setInterval(() => {
    updateBody();
  }, 100)

}

function processBody(results) {
  let check = results[0].pose.score;
  let nosePoint;
  if (check) {
    nosePoint = results[0].pose.keypoints[0];
  }
  if (nosePoint.score > 0.2) {
    body = {
      x: nosePoint.position.x / width,
      y: nosePoint.position.y / height,
      points: body.points,
      chars: body.chars,
      synth: body.synth,
      size: body.size,
      sentiment: body.sentiment
    }
  }
  
}

function updateBody() {
  socket.emit("updateBody", {
    x: body.x,
    y: body.y,
    points: body.points,
    chars: body.chars,
    synth: body.synth,
    size: body.size,
    sentiment: body.sentiment,
  });
}


function modelReady() {
  //select("#status").html("Model Loaded");
}


function drawOthers() {
  for (let id in bodies) {
    drawTrail(bodies[id], id);
    //playSynth(bodies[id]);
  }
}

function getAvg(array) {
  return array.reduce((a, b) => a + b) / array.length;
} 


function playSynth() {

  if(bodies.length == 0 || !body.x) return;
  
  let posVals = [];

  for (let id in bodies) {
    posVals.push({x: bodies[id].x, y: bodies[id].y});
  }
  
  let arr = posVals.map((p) => p.x);
  let avgXVal = getAvg(arr);

  //change note based on tracking position
  let noteIndex = round(map(avgXVal, 0, 1, 0, 6));
  let note = notes[noteIndex];

  //change volume based on closeness of bodies
  if (posVals.length === 1) {
   posVals.push({x: 0.5, y: 0.5})
  } 
  let xDiff = sq(posVals[0].x - posVals[1].x);
  let yDiff = sq(posVals[0].y - posVals[1].y);
  
  let avgDiff = sqrt(xDiff + yDiff);

  let newAmp = map(avgDiff, 0, 0.5, 1, 0);
  synth.amp(newAmp, 0);
  synth.play(note);
}

let isSmoothed = false;
let smoothX, smoothY;
let textAngleOffset = 0;
function drawTrail(b, id) {
  //set size of body based on mic volume
  let vol = ambientMic.getLevel();
  let min_threshold = 0.025;
  let max_threshold = 0.1;

  // let prev = prevBodies[id];
  // if (!isSmoothed) {
  //   smoothX = prev.x;
  //   smoothY = prev.y;
  //   isSmoothed = true;
  // } else if (isSmoothed && smoothX == b.x) {
  //   isSmoothed = false;
  // }

  // console.log(b.x - smoothX);
  // smoothX = lerp(smoothX, b.x, 0.1);
  // smoothY = lerp(smoothY, b.y, 0.1);
  // fill(100);
  // circle(smoothX * width, smoothY * height, 20);


  //threshold for text vs. silence
  if (vol < min_threshold) vol = 0
  else if (vol > max_threshold) vol = max_threshold;
  b.size = map(vol, 0, max_threshold, 0.04, 0.08);


  //draw eye
  drawEye((b.x - 0.0132) * width, (b.y - 0.005) * height);
  drawEye((b.x + 0.0132) * width, (b.y - 0.005) * height);
  drawMouth(b.x * width, (b.y + 0.01) * height, b.size, b.sentiment);
  
  
  for (let i = 0; i < b.points.length; i++) {
    let numVertices = b.chars.length;
    let spacing = 360 / numVertices;
    let angle = spacing * i - 135 + textAngleOffset;
    let padding = 35 + numVertices + (b.size);
    let x = cos(radians(angle)) * padding + b.points[i].x * width;
    let y = sin(radians(angle)) * padding + b.points[i].y * height;

    //generate random colors for text
    let c = map(i, 0, numVertices - 1, 220, 150);
    fill(c * b.x, c * b.y, c * b.x);

    //draw text
    textSize(map(i, 0, numVertices, padding / 2, padding/4));
    text(b.chars[i], x, y);
    textAngleOffset += 0.03;
  }
}


function drawEye(x, y) {
  push();
  noStroke();
  translate(x, y);
  // fill(255);
  // circle(0, 0, 18);
  fill(180);
  circle(0, 0, 15);
  fill(0);
  circle(0, 1, 10);
  fill(180);
  circle(2.2, -2.2, 3.8);
  pop();
}

function drawMouth(x, y, size, sentiment) {
  push();
  translate(-10, -1);
  fill(0);
  stroke(0);
  let emotion = map(sentiment, 0, 1, -4, 4);
  if (emotion == 0) emotion = 3;
  emotion *= map(size, 0.04, 0.08, 1, 6);
  bezier(x, y, x+5, y+emotion, x+15, y+emotion, x+20, y);
  pop();
}


function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  bgBuffer.bgShader.setUniform("u_resolution", [width, height]);

}