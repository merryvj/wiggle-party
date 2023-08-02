# Dance with me? 
This is a creative coding project made and showcased at [ITP Camp 2023](https://itp.nyu.edu/camp2023/) in collaboration with Yilin Ye. 

Two people on different devices – from anywhere in the world – can connect to share a moment of joy. They can choose to speak and watch their words appear. Those words  jiggle and disintegrate on screen as the speaker moves their body in real life. Perhaps it's better to just wiggle...and what happens when both wiggle together?

![IMG_8400_MOV_AdobeExpress](https://github.com/merryvj/movingsoup/assets/41601131/6ddd1ce3-17bb-4919-9ecf-e1a24faded7c)


### Technical details
* Visuals: p5.js with a custom GLSL fragment shader for rendering the "bodies"
* Web-cam motion tracking: [ml5.js](https://ml5js.org/) with the PoseNet model
* Speech recognition: [p5.speech](https://idmnyu.github.io/p5.js-speech/)
* Real-time connectivity: Websockets with [socket.io](https://socket.io/)
