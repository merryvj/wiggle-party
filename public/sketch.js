let socket, video, poseNet, speechMic, speaker;
let bgShader;

//assign a sound for person
//then for each pair, check their locations
//depending on how close they are, alter the volume of their sounds

let synth = new Tone.Synth().toMaster();
let bodies = {}; //from other visitors
let body = {
  x: 0,
  y: 0,
  points: [],
  chars: [],
  synth: null
}

console.log(body);
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
  background(150);

  //start video capture
  video = createCapture(VIDEO);
  video.size(width, height);


  //setup pose detection
  setupModel();

  video.hide();
  

}

function draw() {
  // shader(bgShader);
  // bgShader.setUniform("u_resolution", [width, height]);
  // bgShader.setUniform("u_time", millis() / 1000.0);
  // bgShader.setUniform("u_mouse", [mouseX, map(mouseY, 0, height, height, 0)]);
  // rect(0,0,width,height);

  background(0, 50);
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

    drawOthers();
    playSynth();
  }
}


function setupSocket() {
  socket = io();
  socket.on("bodies", (data) => {
    bodies = data;
    
  });
}


function setupMic() {
  speaker = new p5.Speech();

  let lang = navigator.language || 'en-US';
  speechMic = new p5.SpeechRec(lang, gotSpeech);
  speechMic.continuous = true;
  speechMic.start();
  body.chars = [];

  function gotSpeech() {
    let detected = speechMic.resultString.split("").reverse();
    if(detected.length == 0) return;
    body.chars = detected;
    //body.chars = speechMic.resultString.split(" ");
    isLoaded = true;

    //fade out text after amount of time based on text length
    setTimeout(() => {
      body.chars = "";
    }, 500 * body.chars.length)
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
          synth: body.synth
        }

        socket.emit("updateBody", {
          x: body.x,
          y: body.y,
          points: body.points,
          chars: body.chars,
          synth: body.synth
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
  // let noteIndex = round(map(avgXVal, 0, 1, 0, 6));
  // let note = notes[noteIndex];
  // synth.triggerAttack(note);

  //change volume based on closeness of bodies

  let avgDiff = 0;
  if (posVals.length === 1) {
    avgDiff = abs(posVals[0].x - 0.5);
  } else {
    let diffs = [];
    for(let i = 0; i < posVals.length - 1; i++) {
      let xDiff = abs(posVals[i].x - posVals[i + 1].x);
      let yDiff = abs(posVals[i].y - posVals[i + 1].y);
      diffs.push(xDiff);
      avgDiff = getAvg(diffs);
  }
  }

  let newVol = map(avgDiff, 0, 1, 200, 10)
  synth.freq = newVol;
}

function drawTrail(b) {

  if (b.chars.length == 0) {
    console.log("nothing!")
    fill(255);
    circle(b.x * width, b.y * height, 20);
    return;
  }

  let currChar = 0;
 
  for (let i = 0; i < b.points.length; i++) {
    const c = floor(map(i, 0, b.points.length -1, 255, 100));
    const diameter = floor(map(i, 0, b.points.length - 1, 30, 50));
    
    noStroke();
    fill(c);
    textSize(diameter);
    let x = (b.points[i].x - i*0.02) * width;
    let y = (b.points[i].y) * height;
    text(b.chars[currChar], x, y);
    currChar++; 
  }

}
