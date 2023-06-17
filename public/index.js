const socket = io();

//const canvasContainer = document.getElementById("canvas-container");

let txt;

const sketch = (p) => {
  p.setup = () => {
    p.createCanvas(window.innerWidth, window.innerHeight);
    p.background(153);
    p.textSize(40);
    p.textAlign(p.CENTER);
    p.text("Loading...", p.width / 2, p.height / 2);
  };

  p.draw = () => {
    p.background(153);
    p.textSize(50)
    p.text(txt, p.width/2, p.height/2)
  }
};

new p5(sketch);

socket.on("update", function (number) {
  txt = number;
});
