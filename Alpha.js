// Get the canvas and context
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set up canvas dimensions
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Simulation parameters
const cubeSize = 200;      // boundaries for the 5D cube (each dimension: -cubeSize to cubeSize)
const friction = 0.99;     // damping factor per frame
const restitution = -0.8;  // energy loss on collision with walls
const gravity = 0.2;       // gravity added to the y dimension (index 1)
const numBalls = 100;

// Array to hold ball objects
const balls = [];

// Create a random number between min and max
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Create balls with random initial positions and velocities (in 5D)
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
}

// Create the 5D cube (penteract) vertices and edges
let cubeVertices = [];
let cubeEdges = [];

function createCube() {
  cubeVertices = [];
  const coords = [-cubeSize, cubeSize];
  // There are 2^5 = 32 vertices
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
  // Build edges: two vertices are connected if they differ in exactly one coordinate.
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
}

// --- 5D Rotation Functions ---
// We apply several successive rotations in chosen 2D planes (identified by their indices)
// This function rotates vector v (an array of 5 numbers) using time t to determine angles.
function rotate5d(v, t) {
  let vNew = v.slice();
  vNew = rotatePlane(vNew, 0, 1, t * 0.001); // rotate in x-y
  vNew = rotatePlane(vNew, 0, 2, t * 0.002); // rotate in x-z
  vNew = rotatePlane(vNew, 1, 3, t * 0.003); // rotate in y-w
  vNew = rotatePlane(vNew, 2, 4, t * 0.004); // rotate in z-u
  vNew = rotatePlane(vNew, 3, 4, t * 0.005); // rotate in w-u
  return vNew;
}

// Rotate a 5D vector v in the plane spanned by indices i and j by angle radians.
function rotatePlane(v, i, j, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const vi = v[i], vj = v[j];
  v[i] = vi * cos - vj * sin;
  v[j] = vi * sin + vj * cos;
  return v;
}

// --- Projection from 5D to 2D ---
// We use successive perspective projections:
// 1. From 5D to 4D using the 5th coordinate (index 4)
// 2. From 4D to 3D using the 4th coordinate (index 3)
// 3. From 3D to 2D using the 3rd coordinate (index 2)
function project(v) {
  const d5 = 400, d4 = 400, d3 = 400;
  const factor5 = d5 / (d5 - v[4]);
  const x4 = v[0] * factor5;
  const y4 = v[1] * factor5;
  const z4 = v[2] * factor5;
  const w4 = v[3] * factor5;
  
  const factor4 = d4 / (d4 - w4);
  const x3 = x4 * factor4;
  const y3 = y4 * factor4;
  const z3 = z4 * factor4;
  
  const factor3 = d3 / (d3 - z3);
  const x2d = x3 * factor3;
  const y2d = y3 * factor3;
  
  return [x2d, y2d];
}

// --- Physics Update ---
// Update ball positions, apply gravity, friction, and check collisions with cube walls.
function updatePhysics() {
  for (let ball of balls) {
    // Gravity applied along dimension index 1 (the "y" dimension)
    ball.vel[1] += gravity;
    for (let i = 0; i < 5; i++) {
      ball.pos[i] += ball.vel[i];
      // Bounce if the ball goes outside the hypercube boundaries
      if (ball.pos[i] > cubeSize) {
        ball.pos[i] = cubeSize;
        ball.vel[i] *= restitution;
      } else if (ball.pos[i] < -cubeSize) {
        ball.pos[i] = -cubeSize;
        ball.vel[i] *= restitution;
      }
      // Apply friction to damp the velocity
      ball.vel[i] *= friction;
    }
  }
}

// --- Drawing ---
// For each frame, clear the canvas, draw the cube edges (rotated and projected), and draw the balls.
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const time = Date.now();
  
  // Draw the rotating 5D cube edges
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
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
  
  // Draw the 100 balls
  for (let ball of balls) {
    const rotatedPos = rotate5d(ball.pos, time);
    const projPos = project(rotatedPos);
    const x = projPos[0] + canvas.width / 2;
    const y = projPos[1] + canvas.height / 2;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
  }
}

// --- Main Loop ---
function loop() {
  updatePhysics();
  draw();
  requestAnimationFrame(loop);
}

// Initialize everything and start the loop
createBalls();
createCube();
loop();
