const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const numParticles = 1000; // Number of "fish"
const particles = [];
let analyser;
let audioContext;
let frequencyData;

// Flocking parameters
const separationDistance = 20; // How close fish avoid each other
const alignmentDistance = 50; // Range to align with neighbors
const cohesionDistance = 100; // Range to group together
const maxSpeed = 2; // Maximum swimming speed
const maxForce = 0.1; // Maximum steering force

// Sound threshold for scattering (like a shark attack)
const scatterThreshold = 100; // Adjust this based on your microphone sensitivity

// Create particles (fish)
function createParticles() {
    for (let i = 0; i < numParticles; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: 0, // Velocity x
            vy: 0, // Velocity y
            color: `hsl(${Math.random() * 360}, 100%, 50%)` // Random bright color
        });
    }
}

// Set up audio from the microphone
async function setupAudio() {
    audioContext = new AudioContext();
    await audioContext.resume(); // Resume the AudioContext after user gesture
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    frequencyData = new Uint8Array(analyser.frequencyBinCount);
}

// Get the average sound level
function getAverageFrequency() {
    analyser.getByteFrequencyData(frequencyData);
    const sum = frequencyData.reduce((a, b) => a + b, 0);
    return sum / frequencyData.length;
}

// Vector helper functions for movement
function vector(x, y) { return { x, y }; }
function add(v1, v2) { return { x: v1.x + v2.x, y: v1.y + v2.y }; }
function subtract(v1, v2) { return { x: v1.x - v2.x, y: v1.y - v2.y }; }
function multiply(v, scalar) { return { x: v.x * scalar, y: v.y * scalar }; }
function divide(v, scalar) { return { x: v.x / scalar, y: v.y / scalar }; }
function magnitude(v) { return Math.sqrt(v.x * v.x + v.y * v.y); }
function normalize(v) {
    const mag = magnitude(v);
    return mag > 0 ? divide(v, mag) : v;
}
function limit(v, max) {
    if (magnitude(v) > max) return multiply(normalize(v), max);
    return v;
}

// Flocking behaviors
function separation(particle) {
    let steer = vector(0, 0);
    let count = 0;
    for (let other of particles) {
        if (other !== particle) {
            const distance = Math.hypot(other.x - particle.x, other.y - particle.y);
            if (distance < separationDistance) {
                let diff = subtract(vector(particle.x, particle.y), vector(other.x, other.y));
                diff = normalize(diff);
                diff = divide(diff, distance || 1); // Avoid division by zero
                steer = add(steer, diff);
                count++;
            }
        }
    }
    if (count > 0) steer = divide(steer, count);
    if (magnitude(steer) > 0) {
        steer = normalize(steer);
        steer = multiply(steer, maxSpeed);
        steer = subtract(steer, vector(particle.vx, particle.vy));
        steer = limit(steer, maxForce);
    }
    return steer;
}

function alignment(particle) {
    let velocitySum = vector(0, 0);
    let count = 0;
    for (let other of particles) {
        if (other !== particle) {
            const distance = Math.hypot(other.x - particle.x, other.y - particle.y);
            if (distance < alignmentDistance) {
                velocitySum = add(velocitySum, vector(other.vx, other.vy));
                count++;
            }
        }
    }
    if (count > 0) {
        velocitySum = divide(velocitySum, count);
        velocitySum = normalize(velocitySum);
        velocitySum = multiply(velocitySum, maxSpeed);
        let steer = subtract(velocitySum, vector(particle.vx, particle.vy));
        steer = limit(steer, maxForce);
        return steer;
    }
    return vector(0, 0);
}

function cohesion(particle) {
    let positionSum = vector(0, 0);
    let count = 0;
    for (let other of particles) {
        if (other !== particle) {
            const distance = Math.hypot(other.x - particle.x, other.y - particle.y);
            if (distance < cohesionDistance) {
                positionSum = add(positionSum, vector(other.x, other.y));
                count++;
            }
        }
    }
    if (count > 0) {
        positionSum = divide(positionSum, count);
        let desired = subtract(positionSum, vector(particle.x, particle.y));
        desired = normalize(desired);
        desired = multiply(desired, maxSpeed);
        let steer = subtract(desired, vector(particle.vx, particle.vy));
        steer = limit(steer, maxForce);
        return steer;
    }
    return vector(0, 0);
}

// Scatter when sound is loud (shark attack!)
function scatter(particle, avgFrequency) {
    if (avgFrequency > scatterThreshold) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const direction = normalize(subtract(vector(particle.x, particle.y), vector(centerX, centerY)));
        return multiply(direction, maxForce * 2); // Strong scatter force
    }
    return vector(0, 0);
}

// Update particle positions
function updateParticles() {
    const avgFrequency = getAverageFrequency();
    particles.forEach(particle => {
        let force = vector(0, 0);

        // Normal flocking behavior
        const sep = separation(particle);
        const ali = alignment(particle);
        const coh = cohesion(particle);
        force = add(force, multiply(sep, 1.5)); // Stronger separation
        force = add(force, multiply(ali, 1.0));
        force = add(force, multiply(coh, 1.0));

        // Scatter if sound is loud
        const scatterForce = scatter(particle, avgFrequency);
        force = add(force, scatterForce);

        // Update velocity and position
        particle.vx += force.x;
        particle.vy += force.y;
        particle.vx = limit(vector(particle.vx, 0), maxSpeed).x;
        particle.vy = limit(vector(0, particle.vy), maxSpeed).y;
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges (fish swim off-screen and reappear)
        if (particle.x < 0) particle.x += canvas.width;
        if (particle.x > canvas.width) particle.x -= canvas.width;
        if (particle.y < 0) particle.y += canvas.height;
        if (particle.y > canvas.height) particle.y -= canvas.height;
    });
}

// Draw the particles
function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
    });
}

// Start the visualizer when the button is clicked
document.getElementById('startButton').addEventListener('click', async () => {
    try {
        await setupAudio();
        createParticles();
        function animate() {
            updateParticles();
            drawParticles();
            requestAnimationFrame(animate);
        }
        animate();
        document.getElementById('startButton').style.display = 'none'; // Hide button after starting
    } catch (error) {
        console.error('Error starting visualizer:', error);
    }
});