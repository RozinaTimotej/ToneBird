const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 320;
canvas.height = 480;
const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const bird = {
    x: 50,
    y: 50,
    width: 20,
    height: 20,
    gravity: 0,
    maxVelocity: 2,
    lift: -4,
    velocity: 0,
    show: function () {
        ctx.fillStyle = '#FF0';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    },
    update: function () {
        if (Math.abs(this.velocity) <= this.maxVelocity) {
            this.velocity += this.gravity;
        } else {
            if (this.velocity <= 0) {
                this.velocity += this.gravity;
            } else {
                this.velocity = this.maxVelocity;
            }
        }
        this.y += this.velocity;
        if (this.y > canvas.height - this.height) {
            this.y = canvas.height - this.height;
            this.velocity = 0;
        }
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    },
    up: function () {
        this.velocity = 0;
        this.velocity += this.lift;
    }
};

let pipes = [];
const pipeWidth = 40;
const pipeGap = 200;
let pressed = 0;
let frameCount = 0;
let score = 0;
let gameStart = false;
let gameOver = false;
let userVoice = true; // true = mic/normal mode with pipes, false = demo audio mode (no pipes)
let paused = false;
let rafID = null;

function drawPipes() {
    ctx.fillStyle = '#0F0';
    pipes.forEach(pipe => {
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
        ctx.fillRect(pipe.x, canvas.height - pipe.bottom, pipeWidth, pipe.bottom);
    });
}

function drawText() {
    ctx.font = "25px Arial";
    ctx.fillText("Score: " + score, 10, 80);
}

function updatePipes() {
    if (frameCount % 280 === 0) {
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
    drawText();
    // Draw pipes regardless (so we can see them if they exist)
    drawPipes();
}

function update() {
    bird.update();
    // If userVoice is true (normal mode), update pipes and check collisions
    if (userVoice) {
        updatePipes();
        checkCollision();
    }
    // If userVoice is false (demo mode), skip pipe updates and collisions
    // Bird still moves because bird.update() is always called
    if (pressed !== 0 && pressed !== -1) {
        if (frameCount - pressed > 1) {
            pressed = -1;
        }
    }
}

function gameLoop() {
    if (paused || gameOver) return;
    // Call pitch detection every 5 frames
    if (frameCount % 5 === 0) {
        updatePitchOnce();
    }

    const frequencyText = document.getElementById("pitch").innerText;
    let freqValue = parseInt(frequencyText, 10);
    if (!isNaN(freqValue) && freqValue > 0) {
        var noteNum = notes.length * (Math.log(freqValue / 440) / Math.log(2));
        var note = notes[(Math.round(noteNum) + 69) % notes.length];
        if (note) {
            bird.y = (canvas.height - 30) - (canvas.height / notes.length) * ((Math.round(noteNum) + 69) % notes.length);
        }
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
    // do not pause the game, just switch to demo audio mode
    setUserVoice(false);
    togglePlayback();
    // The loop continues, but userVoice=false means no pipes or collisions
    // Bird continues to move according to pitch from demo audio
}

function startGame() {
    // If a loop is already running, cancel it before starting again
    if (rafID) {
        cancelAnimationFrame(rafID);
        rafID = null;
    }

    // Stop demo audio if playing
    if (isPlaying) {
        togglePlayback();
    }

    // Reset game states
    gameStart = true;
    paused = false;
    gameOver = false;
    pressed = 0;
    frameCount = 0;
    score = 0;
    pipes = [];
    userVoice = true; // back to normal user input mode

    startPitchDetect(); // Starts mic input
    rafID = requestAnimationFrame(gameLoop);
}
