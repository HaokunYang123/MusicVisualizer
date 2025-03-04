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
const cubeSize = 200;      // boundaries for the 5D cube (each dimension: -cubeSize to cubeSize)
const friction = 0.99;     // damping factor per frame
const restitution = -0.8;  // energy loss on collision with walls
const gravity = 0.2;       // gravity added to the y dimension (index 1)
const numBalls = 100;
const turbulenceFactor = 0.05; // Amount of random movement added
const particleInteraction = 0.001; // Strength of particle-to-particle effects
const timeScale = 0.5; // Speed of time-based effects

// Array to hold ball objects
const balls = [];

// Color palettes
const colorPalettes = [
  ['#FF5252', '#FF1744', '#D50000', '#FF4081', '#F50057', '#C51162'], // Reds & Pinks
  ['#536DFE', '#3D5AFE', '#304FFE', '#448AFF', '#2979FF', '#2962FF'], // Blues
  ['#69F0AE', '#00E676', '#00C853', '#B9F6CA', '#00E676', '#00C853'], // Greens
  ['#FFFF00', '#FFEA00', '#FFD600', '#FFF59D', '#FFF176', '#FFEE58']  // Yellows
];

// Select a random color palette
const activePalette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

// Create a random number between min and max
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Create balls with random initial positions, velocities, sizes, and colors (in 5D)
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
        randomInRange(-3, 3),
        randomInRange(-3, 3),
        randomInRange(-3, 3),
        randomInRange(-3, 3),
        randomInRange(-3, 3)
      ],
      size: randomInRange(4, 12),  // Random size for each ball
      color: activePalette[Math.floor(Math.random() * activePalette.length)],
      phase: Math.random() * Math.PI * 2, // Random starting phase for pulsing
      phaseSpeed: randomInRange(0.01, 0.05) // Random phase speed
    });
  }
  console.log('Balls created:', balls.length);
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
  console.log('Cube created:', cubeVertices.length, 'vertices,', cubeEdges.length, 'edges');
}

// --- 5D Rotation Functions ---
function rotate5d(v, t) {
  let vNew = v.slice();
  vNew = rotatePlane(vNew, 0, 1, t * 0.001 * timeScale);
  vNew = rotatePlane(vNew, 0, 2, t * 0.002 * timeScale);
  vNew = rotatePlane(vNew, 1, 3, t * 0.003 * timeScale);
  vNew = rotatePlane(vNew, 2, 4, t * 0.004 * timeScale);
  vNew = rotatePlane(vNew, 3, 4, t * 0.005 * timeScale);
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

function project(v) {
  const d5 = 800, d4 = 800, d3 = 800; // Increased projection distances
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

// Add turbulence to a ball's movement
function addTurbulence(ball) {
  for (let i = 0; i < 5; i++) {
    ball.vel[i] += randomInRange(-turbulenceFactor, turbulenceFactor);
  }
}

// Apply simple particle-to-particle interactions
function applyParticleInteractions() {
  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      // Calculate 5D distance between particles
      let dist = 0;
      for (let k = 0; k < 5; k++) {
        const d = balls[i].pos[k] - balls[j].pos[k];
        dist += d * d;
      }
      dist = Math.sqrt(dist);
      
      if (dist < 50) { // Only interact with nearby particles
        // Normalized direction vector from j to i
        const force = particleInteraction / Math.max(dist, 1);
        
        for (let k = 0; k < 5; k++) {
          const direction = (balls[i].pos[k] - balls[j].pos[k]) / dist;
          // Slight attraction/repulsion based on distance
          const forceComponent = direction * force;
          balls[i].vel[k] += forceComponent;
          balls[j].vel[k] -= forceComponent;
        }
      }
    }
  }
}

function updatePhysics() {
  const time = Date.now();
  
  // Apply particle interactions
  applyParticleInteractions();
  
  for (let ball of balls) {
    // Add some turbulence
    if (Math.random() < 0.05) { // 5% chance per frame per ball
      addTurbulence(ball);
    }
    
    // Update phase for pulsing effect
    ball.phase += ball.phaseSpeed;
    
    // Gravity applied along dimension index 1 (the "y" dimension)
    ball.vel[1] += gravity;
    
    for (let i = 0; i < 5; i++) {
      ball.pos[i] += ball.vel[i];
      
      // Bounce if the ball goes outside the hypercube boundaries
      if (ball.pos[i] > cubeSize) {
        ball.pos[i] = cubeSize;
        ball.vel[i] *= restitution;
        
        // Change color on bounce
        if (Math.random() < 0.3) { // 30% chance to change color on bounce
          ball.color = activePalette[Math.floor(Math.random() * activePalette.length)];
        }
      } else if (ball.pos[i] < -cubeSize) {
        ball.pos[i] = -cubeSize;
        ball.vel[i] *= restitution;
        
        // Change color on bounce
        if (Math.random() < 0.3) { // 30% chance to change color on bounce
          ball.color = activePalette[Math.floor(Math.random() * activePalette.length)];
        }
      }
      
      // Apply friction to damp the velocity
      ball.vel[i] *= friction;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const time = Date.now();
  
  // Draw cube edges
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
  
  // Draw balls with depth effect - sort by z-dimension
  const sortedBalls = balls.map((ball, index) => {
    const rotatedPos = rotate5d(ball.pos, time);
    const projPos = project(rotatedPos);
    const x = projPos[0] + canvas.width / 2;
    const y = projPos[1] + canvas.height / 2;
    
    // Calculate depth for sorting and size scaling
    const depth = rotatedPos[2] + 400; // Add offset to keep positive
    
    return {
      index: index,
      x: x,
      y: y,
      ball: ball,
      depth: depth
    };
  }).sort((a, b) => a.depth - b.depth); // Sort by depth
  
  // Draw balls from back to front
  for (let item of sortedBalls) {
    const ball = item.ball;
    const x = item.x;
    const y = item.y;
    
    // Scale size based on depth and add pulsing effect
    const sizeScale = (item.depth / 800) * (1 + 0.2 * Math.sin(ball.phase));
    const size = ball.size * sizeScale;
    
    // Calculate alpha based on depth (farther = more transparent)
    const alpha = Math.min(1, item.depth / 400);
    
    // Draw the particle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    
    // Add glow effect
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
    const baseColor = ball.color;
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw core of the particle
    ctx.beginPath();
    ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
  }
  
  // Add subtle background glow
  ctx.fillStyle = `rgba(${Math.sin(time * 0.001) * 20 + 20}, ${Math.sin(time * 0.0015) * 20 + 20}, ${Math.sin(time * 0.002) * 40 + 40}, 0.1)`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function loop() {
  try {
    updatePhysics();
    draw();
    requestAnimationFrame(loop);
  } catch (error) {
    console.error('Animation error:', error);
  }
}

// Initialize everything and start the loop
console.log('Starting initialization...');
createBalls();
createCube();
console.log('Starting animation loop...');
loop();