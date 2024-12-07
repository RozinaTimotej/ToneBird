const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 320;
canvas.height = 480;

const bird = {
    x: 50,
    y: 150,
    width: 20,
    height: 20,
    gravity: 0.1,
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
                this.velocity  += this.gravity;
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
let gameOver = false;

function drawPipes() {
    ctx.fillStyle = '#0F0';
    pipes.forEach(pipe => {
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
        ctx.fillRect(pipe.x, canvas.height - pipe.bottom, pipeWidth, pipe.bottom);
    });
}

function drawText() {
    ctx.font = "25px Arial";
    ctx.fillText("Score: "+score, 10, 80);
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

    tmp = pipes.filter(pipe => pipe.x + pipeWidth > 0)
    score += pipes.length - tmp.length ;
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
    updatePipes();
    checkCollision();
    if (pressed !== 0 && pressed !== -1) {
        if (frameCount - pressed > 1) {
            pressed = -1;
        }
    }
    console.log(score)
}

function loop() {
    if (!gameOver) {
        draw();
        update();
        frameCount++;
        requestAnimationFrame(loop);
    } else {
        ctx.fillStyle = '#000';
        ctx.font = '30px Arial';
        ctx.fillText('Game Over', canvas.width / 2 - 70, canvas.height / 2);
    }

}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (pressed == 0) {
            bird.up();
            pressed = frameCount
        }
    }
});


document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        if (pressed == -1) {
            pressed = 0
        }
    }
});

loop();
