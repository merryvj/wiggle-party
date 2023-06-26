let socket, video, poseNet, speechMic, ambientMic, speaker;
let bgShader, bgBuffer;


//assign a sound for person
//then for each pair, check their locations
//depending on how close they are, alter the volume of their sounds

let synth;
let bodies = {}; //from other visitors
let body = {
  x: 0,
  y: 0,
  points: [],
  chars: [],
  synth: null,
  size: 0.02,
}

let notes = ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4']

let isLoaded = false;

function preload() {
  bgShader = loadShader('bg.vert', 'bg.frag');
}

function setup() {
  //setup socket
  setupSocket();
  
  //setupMic
  setupMic();

  //setup canvas
  createCanvas(window.innerWidth, window.innerHeight);
  bgBuffer = createGraphics(window.innerWidth, window.innerHeight, WEBGL);
  bgBuffer.bgShader = bgShader;

  //start video capture
  video = createCapture(VIDEO);
  video.size(width, height);

  //setup pose detection
  setupModel();

  synth = new p5.MonoSynth();
  synth.triggerAttack();
  synth.amp(0, 0);

  video.hide();

}

function draw() {
  

  background(5);
  if(!isLoaded) {
    fill(150);
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

    drawShader();
    drawOthers();

  }
}

let pointNum;
function drawShader() {
  bgBuffer.clear();
  bgBuffer.reset();
  bgBuffer.push();
  bgBuffer.shader(bgShader);
  bgBuffer.bgShader.setUniform("u_resolution", [width, height]);
  bgBuffer.bgShader.setUniform("u_time", millis() / 1000.0);
  
  //check if second body exists
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
    bodies = data;
    
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
    isLoaded = true;

    //fade out text after amount of time based on text length
    setTimeout(() => {
      body.chars = "";
    }, 1000 + 500 * body.chars.length)
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
      if (nosePoint.score > 0.5) {
        body = {
          x: nosePoint.position.x / width,
          y: nosePoint.position.y / height,
          points: body.points,
          chars: body.chars,
          synth: body.synth,
          size: body.size
        }

        socket.emit("updateBody", {
          x: body.x,
          y: body.y,
          points: body.points,
          chars: body.chars,
          synth: body.synth,
          size: body.size
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
    playSynth(bodies[id]);
  }
}

function getAvg(array) {
  return array.reduce((a, b) => a + b) / array.length;
} 


// function playSynth(b) {
//   if(b.synth == null) return;
//   console.log(b.synth);
//   let noteIndex = round(map(b.x, 0, 1, 0, 6));
//   body.synth.play(notes[noteIndex], 1, 0, 1.5);
// }
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

  let newAmp = map(avgDiff, 0, 0.6, 1, 0);
  synth.amp(newAmp, 0);
  synth.play(note);
}

function drawTrail(b) {

  //set size of body based on mic volume
  let vol = ambientMic.getLevel();
  let min_threshold = 0.035;
  let max_threshold = 0.1;

  //threshold for text vs. silence
  if (vol < min_threshold) vol = 0
  else if (vol > max_threshold) vol = max_threshold;
  b.size = map(vol, 0, max_threshold, 0.02, 0.1);
  
  for (let i = 0; i < b.chars.length; i++) {
    let numVertices = b.chars.length;
    let spacing = 360 / numVertices;
    let angle = spacing * i - 135;
    let padding = 30 + numVertices + (b.size * 200);
    let x = cos(radians(angle)) * padding + b.points[i].x * width;
    let y = sin(radians(angle)) * padding + b.points[i].y * height;

    //generate random colors for text
    let c = map(i, 0, numVertices - 1, 180, 100);
    fill(c * b.x, c * b.y, c * b.x);


    textSize(map(i, 0, numVertices, padding / 2, padding/4));
    text(b.chars[i], x, y);
  }

}
