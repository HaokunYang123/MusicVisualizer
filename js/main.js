// Get the canvas and context
const canvas = document.getElementById('canvas');
if (!canvas) {
    console.error('Canvas element not found');
    throw new Error('Canvas element not found');
}
const ctx = canvas.getContext('2d');
if (!ctx) {
    console.error('Failed to get 2D context');
    throw new Error('Failed to get 2D context');
}

console.log('Canvas initialized:', canvas);

// Set up canvas dimensions
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log('Canvas resized:', canvas.width, canvas.height);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Simulation parameters
const cubeSize = 200;      // boundaries for the 5D cube
const friction = 0.99;     // damping factor per frame
const restitution = -0.8;  // energy loss on collision
const gravity = 0.2;       // gravity in y dimension
const numBalls = 100;

// Array to hold ball objects
const balls = [];

// Random number helper
function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
}

// Create balls with random 5D positions and velocities
function createBalls() {
    for (let i = 0; i < numBalls; i++) {
        balls.push({
            pos: [
                randomInRange(-cubeSize, cubeSize),
                randomInRange(-cubeSize, cubeSize),
                randomInRange(-cubeSize, cubeSize),
                randomInRange(-cubeSize, cubeSize),
                randomInRange(-cubeSize, cubeSize)
            ],
            vel: [
                randomInRange(-2, 2),
                randomInRange(-2, 2),
                randomInRange(-2, 2),
                randomInRange(-2, 2),
                randomInRange(-2, 2)
            ]
        });
    }
    console.log('Balls created:', balls.length);
}

// Create 5D cube (penteract) vertices and edges
let cubeVertices = [];
let cubeEdges = [];

function createCube() {
    cubeVertices = [];
    const coords = [-cubeSize, cubeSize];
    // Generate 32 vertices (2^5)
    for (let a of coords) {
        for (let b of coords) {
            for (let c of coords) {
                for (let d of coords) {
                    for (let e of coords) {
                        cubeVertices.push([a, b, c, d, e]);
                    }
                }
            }
        }
    }
    // Build edges: connect vertices differing in one coordinate
    cubeEdges = [];
    for (let i = 0; i < cubeVertices.length; i++) {
        for (let j = i + 1; j < cubeVertices.length; j++) {
            let diff = 0;
            for (let k = 0; k < 5; k++) {
                if (cubeVertices[i][k] !== cubeVertices[j][k]) diff++;
            }
            if (diff === 1) {
                cubeEdges.push([i, j]);
            }
        }
    }
    console.log('Cube created:', cubeVertices.length, 'vertices,', cubeEdges.length, 'edges');
}

// 5D rotation: apply successive 2D plane rotations
function rotate5d(v, t) {
    let vNew = v.slice();
    vNew = rotatePlane(vNew, 0, 1, t * 0.001); // x-y
    vNew = rotatePlane(vNew, 0, 2, t * 0.002); // x-z
    vNew = rotatePlane(vNew, 1, 3, t * 0.003); // y-w
    vNew = rotatePlane(vNew, 2, 4, t * 0.004); // z-u
    vNew = rotatePlane(vNew, 3, 4, t * 0.005); // w-u
    return vNew;
}

function rotatePlane(v, i, j, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const vi = v[i], vj = v[j];
    v[i] = vi * cos - vj * sin;
    v[j] = vi * sin + vj * cos;
    return v;
}

// Project 5D to 2D via successive perspective projections
function project(v) {
    const d5 = 800, d4 = 800, d3 = 800; // Projection distances
    const factor5 = d5 / (d5 - v[4] + 400);
    const x4 = v[0] * factor5;
    const y4 = v[1] * factor5;
    const z4 = v[2] * factor5;
    const w4 = v[3] * factor5;
    
    const factor4 = d4 / (d4 - w4 + 400);
    const x3 = x4 * factor4;
    const y3 = y4 * factor4;
    const z3 = z4 * factor4;
    
    const factor3 = d3 / (d3 - z3 + 400);
    const x2d = x3 * factor3;
    const y2d = y3 * factor3;
    
    return [x2d, y2d];
}

// Physics update: gravity, friction, wall collisions
function updatePhysics() {
    for (let ball of balls) {
        ball.vel[1] += gravity; // Gravity in y dimension
        for (let i = 0; i < 5; i++) {
            ball.pos[i] += ball.vel[i];
            if (ball.pos[i] > cubeSize) {
                ball.pos[i] = cubeSize;
                ball.vel[i] *= restitution;
            } else if (ball.pos[i] < -cubeSize) {
                ball.pos[i] = -cubeSize;
                ball.vel[i] *= restitution;
            }
            ball.vel[i] *= friction;
        }
    }
}

// Draw cube edges and balls
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const time = Date.now();
    
    // Draw rotating 5D cube edges
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    const projectedVertices = cubeVertices.map(v => {
        const rotated = rotate5d(v, time);
        const proj = project(rotated);
        return [proj[0] + canvas.width / 2, proj[1] + canvas.height / 2];
    });
    for (let edge of cubeEdges) {
        const v1 = projectedVertices[edge[0]];
        const v2 = projectedVertices[edge[1]];
        ctx.beginPath();
        ctx.moveTo(v1[0], v1[1]);
        ctx.lineTo(v2[0], v2[1]);
        ctx.stroke();
    }
    
    // Draw balls
    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
    for (let ball of balls) {
        const rotatedPos = rotate5d(ball.pos, time);
        const projPos = project(rotatedPos);
        const x = projPos[0] + canvas.width / 2;
        const y = projPos[1] + canvas.height / 2;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Main animation loop
function loop() {
    try {
        updatePhysics();
        draw();
        requestAnimationFrame(loop);
    } catch (error) {
        console.error('Animation error:', error);
        throw error; // Let window.onerror catch it
    }
}

// Initialize and start
console.log('Starting initialization...');
try {
    createBalls();
    createCube();
    console.log('Starting animation loop...');
    loop();
} catch (error) {
    console.error('Initialization error:', error);
    throw error;
}