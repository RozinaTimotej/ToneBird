const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

var height = document.body.clientHeight;
var width = document.body.clientWidth;

canvas.width = width > 600 ? 600:width;
canvas.height = height-30;
const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const birdImage = new Image();
birdImage.src = '../assets/flappy.png';

const tubeImage = new Image();
tubeImage.src = 'assets/tube.png';

const bird = {
    x: 110,
    y: 150,
    targetY: 50, // Smooth transition target
    width: 50,
    height: 50,
    gravity: 0.1,
    maxVelocity: 2,
    lift: -4,
    velocity: 0,
    smoothness: 0.1, // Interpolation factor for smooth movement
    show: function () {

        ctx.drawImage(birdImage, bird.x, bird.y, bird.width, bird.height);
    },
    update: function () {
        // Smoothly interpolate towards targetY
        this.y += (this.targetY - this.y) * this.smoothness;

        // Ensure the bird stays within canvas bounds
        if (this.y > canvas.height - this.height) {
            this.y = canvas.height - this.height;
            this.velocity = 0;
        }
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    },
    setTarget: function (pitch) {
        // Calculate the targetY based on pitch
        const noteIndex = (Math.round(12 * Math.log2(pitch / 440)) + 69) % notes.length;
        this.targetY = (canvas.height - 30) - (canvas.height / notes.length) * noteIndex;
    }
};

let pipes = [];
const pipeWidth = 80;
const pipeGap = 200;
let pressed = 0;
let frameCount = 0;
let score = 0;
let gameStart = false;
let gameOver = false;
let userVoice = true;
let freeRoam = false;
let paused = false;
let rafID = null;
let currentNote = "--"; // Current detected note

function drawPipes() {
    ctx.fillStyle = '#0F0';
    pipes.forEach(pipe => {
        ctx.drawImage(tubeImage, pipe.x, 0, pipeWidth, pipe.top);

        ctx.drawImage(tubeImage, pipe.x, canvas.height - pipe.bottom, pipeWidth, pipe.bottom);
    });
}

function drawText() {
    ctx.font = "25px Arial";
    ctx.fillStyle = '#000';
    ctx.fillText("Score: " + score, 10, 40);

    // Display the current detected note
    ctx.fillText("Tone: " + currentNote, 10, 80);
}

function updatePipes() {
    if (frameCount % 280 === 0 && frameCount > 250) {
        const top = Math.random() * (canvas.height / 2);
        const bottom = canvas.height - top - pipeGap;
        pipes.push({ x: canvas.width, top, bottom });
    }

    pipes.forEach(pipe => {
        pipe.x -= 0.7;
    });

    let tmp = pipes.filter(pipe => pipe.x + pipeWidth > 0);
    score += pipes.length - tmp.length;
    pipes = tmp;
}

function checkCollision() {
    for (let i = 0; i < pipes.length; i++) {
        const pipe = pipes[i];
        if (bird.x < pipe.x + pipeWidth &&
            bird.x + bird.width > pipe.x &&
            (bird.y < pipe.top || bird.y + bird.height > canvas.height - pipe.bottom)) {
            gameOver = true;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bird.show();
    drawPipes();
    drawText();
}

function update() {
    bird.update();
    
    if (userVoice && !freeRoam) {
        updatePipes();
        checkCollision();
    }

    if (pressed !== 0 && pressed !== -1) {
        if (frameCount - pressed > 1) {
            pressed = -1;
        }
    }
}

function gameLoop() {
    if (paused) return;

    if(gameOver){
        ctx.font = "25px Arial";
        ctx.fillStyle = '#000';
        ctx.fillText("Konec igre", canvas.width/2 - 10, canvas.height/2 - 12); 
        return;
    } 

    // Call pitch detection every 5 frames
    if (frameCount % 5 === 0) {
        updatePitchOnce();
    }

    const frequencyText = document.getElementById("pitch").innerText;
    let freqValue = parseInt(frequencyText, 10);

    // Set bird's target position based on frequency
    if (!isNaN(freqValue) && freqValue > 0) {
        const noteIndex = (Math.round(12 * Math.log2(freqValue / 440)) + 69) % notes.length;
        currentNote = notes[noteIndex]; // Update the current note
        bird.setTarget(freqValue);
    }

    draw();
    update();
    frameCount++;
    rafID = requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (pressed == 0) {
            bird.up();
            pressed = frameCount;
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        if (pressed == -1) {
            pressed = 0;
        }
    }
});

function setUserVoice(bool) {
    userVoice = bool;
}

function useDemoAudio() {
    pausedSound = false;
    setUserVoice(false);
    togglePlayback();
}

function startGame(withObject) {
    if (rafID) {
        cancelAnimationFrame(rafID);
        rafID = null;
    }

    if (isPlaying) {
        togglePlayback();
    }

    gameStart = true;
    freeRoam = withObject
    paused = false;
    gameOver = false;
    pressed = 0;
    frameCount = 0;
    score = 0;
    pipes = [];
    userVoice = true;
    currentNote = "--";

    startPitchDetect();
    rafID = requestAnimationFrame(gameLoop);
}
