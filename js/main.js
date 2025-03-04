// Get the canvas and context
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size to full viewport
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Simulation parameters
const numParticles = 1000;
const friction = 0.99; // Slows down particles over time
const bounceFactor = -0.9; // Makes particles super bouncy
const particles = [];

// Function to create particles with random positions and velocities
function createParticles() {
    for (let i = 0; i < numParticles; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 2, // Small random velocity
            vy: (Math.random() - 0.5) * 2,
            color: `hsl(${Math.random() * 360}, 100%, 50%)` // Random color
        });
    }
}

// Function to set up audio context and analyser
async function setupAudio() {
    const audioContext = new AudioContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512; // Number of frequency bins
    source.connect(analyser);
    return analyser;
}

// Update particle positions based on audio data
function updateParticles(analyser) {
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    // Calculate average frequency to influence particle movement
    const avgFrequency = frequencyData.reduce((a, b) => a + b) / frequencyData.length;

    particles.forEach(particle => {
        // Add audio influence to velocity
        particle.vx += (Math.random() - 0.5) * (avgFrequency / 255);
        particle.vy += (Math.random() - 0.5) * (avgFrequency / 255);

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off walls (invisible box)
        if (particle.x < 0 || particle.x > canvas.width) {
            particle.vx *= bounceFactor;
            particle.x = particle.x < 0 ? 0 : canvas.width;
        }
        if (particle.y < 0 || particle.y > canvas.height) {
            particle.vy *= bounceFactor;
            particle.y = particle.y < 0 ? 0 : canvas.height;
        }

        // Apply friction to gradually slow down particles
        particle.vx *= friction;
        particle.vy *= friction;
    });
}

// Draw particles on the canvas
function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
    });
}

// Main animation loop
function animate(analyser) {
    updateParticles(analyser);
    drawParticles();
    requestAnimationFrame(() => animate(analyser));
}

// Initialize and start the visualizer
async function startVisualizer() {
    try {
        const analyser = await setupAudio();
        createParticles();
        animate(analyser);
    } catch (error) {
        console.error('Error setting up audio:', error);
    }
}

// Start the visualizer when the page loads
window.addEventListener('load', startVisualizer);