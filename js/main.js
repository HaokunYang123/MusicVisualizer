// Get the canvas and context
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

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
const cubeSize = 1000;      // Increased from 200 to make the box larger
const friction = 0.999;     // Increased from 0.99 to minimize energy loss
const restitution = -0.99;  // Changed from -0.8 for super bouncy particles
const gravity = 0.2;        // Unchanged
const numBalls = 1000;      // Increased from 100 to 1000 particles
const scale = 200 / cubeSize; // Scale factor to fit the larger box on canvas

// Array to hold particle objects
const balls = [];

// Random number helper
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Create particles with random 5D positions and velocities
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
  console.log('Particles created:', balls.length);
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

// Draw only the particles (no cube edges)
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const time = Date.now();
  
  // Draw the 1000 super bouncy particles
  ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
  ctx.beginPath(); // Batch drawing for performance
  for (let ball of balls) {
    const rotatedPos = rotate5d(ball.pos, time);
    const projPos = project(rotatedPos);
    const x = projPos[0] * scale + canvas.width / 2;
    const y = projPos[1] * scale + canvas.height / 2;
    ctx.moveTo(x, y);
    ctx.arc(x, y, 2, 0, Math.PI * 2); // Smaller size for particles
  }
  ctx.fill(); // Fill all particles in one go
}

// Main animation loop
function loop() {
  try {
    updatePhysics();
    draw();
    requestAnimationFrame(loop);
  } catch (error) {
    console.error('Animation error:', error);
  }
}

// Initialize and start
console.log('Starting initialization...');
createBalls();
createCube();
console.log('Starting animation loop...');
loop();