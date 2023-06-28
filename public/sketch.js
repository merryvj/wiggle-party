let socket, video, poseNet, speechMic, ambientMic, speaker, synth;
let bgShader, bgBuffer;
let instructions = "say something...or just...groove?";
let pixelDensity = 2;
let distBetween = 0.5; let isOverlapping = false;
let startBttn;

let bodies = {}; //from other visitors
let body = {
  x: 0.5,
  y: 0.5,
  prev: {
    x: 0.5,
    y: 0.5
  },
  points: [],
  chars: [],
  synth: null,
  size: 0.04,
  sentiment: 0.5,
}

let prevBodies = {body};


let notes = ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4']

let isLoaded = false;

function preload() {
  bgShader = loadShader('bg.vert', 'bg.frag');
}

function setup() {
  setupSocket();
  setupMic();
  textFont('Georgia');


  //setup canvas
  createCanvas(window.innerWidth, window.innerHeight);
  bgBuffer = createGraphics(window.innerWidth, window.innerHeight, WEBGL);
  bgBuffer.bgShader = bgShader;
  pixelDensity = window.pixelDensity();
  
  //start video capture
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  //setup synth
  synth = new p5.MonoSynth();
  synth.triggerAttack();
  synth.amp(0, 0);

  setupModel();

  //set up start button
  startBttn = createButton("i'm ready to wiggle!");
    startBttn.size(180, 40);
    startBttn.position(width/2 - 90, height/2 + 25);
    startBttn.mousePressed(() => {
      isLoaded = true;
      userStartAudio();
      startBttn.remove();
      setTimeout(() => {
        instructions = ""
      }, 10000)
    })
}


function draw() {
  background(0);
  if(isLoaded) {
    //fill in empty point array 
    if(body.points.length == 0) {
      for (let i = 0; i < 20; i++) {
        body.points.push({ x: 0.5, y: 0.5});
      }
    //handle 
    } else if (body.points.length < body.chars.length) {
      for (let i = body.points.length - 1; i < body.chars.length; i++){
        body.points.push({ x: 0, y: 0});
      }
    } else if (body.chars.length < 20 && body.points.length > 20) {
      for (let i = body.points.length - 1; i > 19; i--) {
        body.points.pop();
      }
    }

    for (let i = 0; i < body.points.length - 1; i++) {
      body.points[i] = body.points[i + 1];
    }
    body.points[body.points.length - 1] = { x: body.prev.x, y: body.prev.y };

    drawShader();
    drawOthers();
    
  }
  drawText();
}

function drawText() {
  push();
  fill(180);
  textSize(width * 0.02);
  textAlign(CENTER);
  if (!isLoaded) {
    text("please allow webcam and video access <3", width/2, height/2);
    
  } else {

    text(instructions, width/2, height-50);
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
  bgBuffer.bgShader.setUniform("density", pixelDensity);

  
  // pointNum = 1;
  // for (let id in bodies) {
  //   let b = bodies[id];
  //   let size = isOverlapping ? b.size * 1.5 : b.size;
  //   bgBuffer.bgShader.setUniform(`point${pointNum}`, [b.prev.x, map(b.prev.y, 0, 1, 1, 0)]);
  //   bgBuffer.bgShader.setUniform(`radius${pointNum}`, size * pixelDensity);
  //   pointNum++;
  // }

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
    if (Object.keys(bodies).length > 0) {
      for (let id in bodies){
        console.log(bodies[id])
      }
    }
    bodies = data;
  //   setTimeout(() => {
  //     isLoaded = true;
  // }, 3000)
    
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
    instructions = "";
    let detected = speechMic.resultString.split("");
    if(detected.length == 0) return;
    body.chars = detected;
    let text = speechMic.resultString;
    body.sentiment = sentiment.predict(text).score;
    console.log(detected);
    // setTimeout(() => {
    //   body.chars = "";
    // }, 1000 + 500 * body.chars.length)
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
    processBody(results);
  })

  sentiment = ml5.sentiment('movieReviews', modelReady);

  setInterval(() => {
    updateBody();
  }, 1000/24)

}

function processBody(results) {
  let check = results[0].pose.score;
  let nosePoint;
  if (check) {
    nosePoint = results[0].pose.keypoints[0];
  }
  if (nosePoint.score > 0.2) {
    let newBody = {
      x: nosePoint.position.x / width,
      y: nosePoint.position.y / height,
      prev: {x: body.prev.x, y: body.prev.y},
      points: body.points,
      chars: body.chars,
      synth: body.synth,
      size: body.size,
      sentiment: body.sentiment
    }

    //stabilize movement
    if (abs(newBody.x - body.x) > 0.01) {
      body = newBody;
    }
  }
  
}

function updateBody() {
  socket.emit("updateBody", {
    x: body.x,
    y: body.y,
    prev: {x: body.prev.x, y: body.prev.y},
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
  //check if bodies are overlapping i.e. nearby each other
  if (Object.keys(bodies).length > 1) {
    let b1 = bodies[Object.keys(bodies)[0]];
    let b2 = bodies[Object.keys(bodies)[1]]

    distBetween = sqrt(sq(b1.x - b2.x) + sq(b1.y - b2.y));
    if (distBetween < 0.08) isOverlapping = true
    else isOverlapping = false;
  }

  let pointNum = 1;
  for (let id in bodies) {
    drawTrail(bodies[id], pointNum);
    if (isOverlapping) {
      playSynth(bodies[id]);
    }
    pointNum++;
  }
}

function getAvg(array) {
  return array.reduce((a, b) => a + b) / array.length;
} 

function playSynth() {
  
  let posVals = [];

  for (let id in bodies) {
    posVals.push({x: bodies[id].x, y: bodies[id].y});
  }
  
  let arr = posVals.map((p) => p.x);
  let avgXVal = getAvg(arr);

  //change note based on tracking position
  let noteIndex = round(map(avgXVal, 0, 1, 0, 6));
  let note = notes[noteIndex];

  // //change volume based on closeness of bodies
  // if (posVals.length === 1) {
  //  posVals.push({x: 0.5, y: 0.5})
  // } 

  let newAmp = map(distBetween, 0, 0.08, 1, 0.1);
  synth.amp(newAmp, 0);
  synth.play(note);
}

let isSmoothed = false;

function drawTrail(b, pointNum) {
  //set size of body based on mic volume
  let vol = ambientMic.getLevel();
  let min_threshold = 0.08;
  let max_threshold = 0.8;

  if (!isSmoothed) {
    b.x = body.prev.x;
    b.y = body.prev.y;
    isSmoothed = true;
  } else if (isSmoothed && body.prev.x == b.x) {
    isSmoothed = false;
  }

  body.prev.x = lerp(body.prev.x, b.x, 0.1);
  body.prev.y = lerp(body.prev.y, b.y, 0.1);

  //update shaders
  let size = isOverlapping ? b.size * 1.5 : b.size;
  bgBuffer.bgShader.setUniform(`point${pointNum}`, [body.prev.x, map(body.prev.y, 0, 1, 1, 0)]);
  bgBuffer.bgShader.setUniform(`radius${pointNum}`, size * pixelDensity);

  //threshold for text vs. silence
  if (vol < min_threshold) vol = 0
  else if (vol > max_threshold) vol = max_threshold;
  b.size = map(vol, 0, max_threshold, 0.04, 0.08);


  if (!isOverlapping) {
    //draw eye and mouth
    drawEye((body.prev.x - 0.0132) * width, (body.prev.y - 0.005) * height);
    drawEye((body.prev.x + 0.0132) * width, (body.prev.y - 0.005) * height);
    drawMouth(body.prev.x * width, (body.prev.y + 0.01) * height, b.size, b.sentiment);

    //draw text
    for (let i = 0; i < b.points.length; i++) {
      let numVertices = b.points.length;
      let spacing = 360 / numVertices;
      let angle = spacing * i - 135;
      let padding = 40 + numVertices + (b.size);
      let x = cos(radians(angle)) * padding + b.points[i].x * width;
      let y = sin(radians(angle)) * padding + b.points[i].y * height;

      //generate random colors for text
      let c = map(i, 0, numVertices - 1, 230, 180);
      fill(c * b.x, c * b.y, c * b.x);

      //position text
      textSize(map(i, 0, numVertices, padding / 2.2, padding/4.2));
      text(b.chars[i], x, y);
    }
  }
}


function drawEye(x, y) {
  push();
  noStroke();
  translate(x, y);
  let diameter = 10 + 0.005 * width;
  fill(180);
  circle(0, 0, diameter);
  fill(0);
  circle(0, 1, diameter * 0.7);
  fill(180);
  circle(2.2, -2.2, diameter * 0.3);
  pop();
}

function drawMouth(x, y, size, sentiment) {
  push();
  translate(-10, -1);
  fill(0);
  stroke(0);
  let emotion = map(sentiment, 0, 1, -4, 4);
  if (emotion == 0) emotion = 3;
  emotion *= map(size, 0.04, 0.08, 1, 5);
  bezier(x, y, x+5, y+emotion, x+15, y+emotion, x+20, y);
  pop();
}


function windowResized() {
  resizeCanvas(window.innerWidth, window.innerHeight);
  bgBuffer.width = window.innerWidth;
  bgBuffer.height = window.innerHeight;
  bgBuffer.bgShader.setUniform("u_resolution", [width, height]);
}