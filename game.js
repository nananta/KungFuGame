// Initialize Matter.js modules
const { Engine, Render, World, Bodies, Body, Runner, Events, Composite, Query, Vector } = Matter;

// Game variables
let engine, render, runner;
let panda, ground, walls = [];
let obstacles = [];
let score = 0;
let gameStarted = false;
let gameOver = false;
let lastObstacleTime = 0;
let combo = 0;
let comboTimer = 0;
let powerLevel = 1;
let initialObstaclesCreated = false;
let originalObstaclePositions = []; // Store original positions of obstacles

// Sound effects
let breakSound, jumpSound, powerUpSound;

// Constants
const PANDA_SIZE = 40;
const GROUND_HEIGHT = 50;
const MAX_SPEED = 15;
const MAX_VERTICAL_SPEED = 20; // New constant for vertical speed limit
const JUMP_FORCE = -0.3; // Reduced jump force
const ACCELERATION = 0.5;
const FRICTION = 0.05;
const OBSTACLE_FREQUENCY = 3000;
const COMBO_TIMEOUT = 2000;
const EXPLOSIVE_FORCE = 1.2;
const EXPLOSIVE_RADIUS = 150;
const CONTINUOUS_JUMP_FORCE = -0.2; // Reduced continuous jump force
const POWER_UP_DURATION = 5000; // 5 seconds for power-ups

// Giant Size power-up
const GIANT_SIZE = 'giant-size';
let powerUpActive = false;
let powerUpEndTime = 0;
let originalPandaSize = PANDA_SIZE;
let giantPowerUpPresent = false;

// Physics constants
const RESTITUTION = 0.5; // Higher bounciness for more lively bounces
const FRICTION_VALUE = 0.1; // Lower friction to allow sliding
const AIR_FRICTION = 0.001; // Very low air friction to maintain momentum
const DENSITY = 0.005; // Lower density to make blocks lighter and more responsive to hits

// Image paths
const PANDA_IMAGE_PATH = './assets/KungFuPanda.png';
const BACKGROUND_IMAGE_PATH = './assets/ChineseMountain.png';
const RAT_NINJA_IMAGE_PATH = './assets/RatNinja.png';

// Key states
const keys = {
    right: false,
    left: false,
    up: false
};

// Add touch control variables
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const SWIPE_THRESHOLD = 50; // Minimum distance for a swipe
const SWIPE_RESTRAINT = 100; // Maximum perpendicular distance for a swipe

// Add touch tracking variables
let touchActive = false;
let touchCenterX = 0;
const TOUCH_DEADZONE = 20; // Pixels from center before movement starts
const TOUCH_SENSITIVITY = 0.5; // Movement sensitivity

// Initialize the game
function init() {
    console.log("Initializing game...");
    
    // Create engine with improved physics settings
    engine = Engine.create({
        gravity: { x: 0, y: 1, scale: 0.001 },
        constraintIterations: 4,
        positionIterations: 8,
        velocityIterations: 8
    });
    
    // Create renderer with fixed dimensions
    const gameCanvas = document.getElementById('game-canvas');
    const width = 800;  // Fixed width
    const height = 600; // Fixed height
    
    render = Render.create({
        element: gameCanvas,
        engine: engine,
        options: {
            width: width,
            height: height,
            wireframes: false,
            background: 'transparent',
            pixelRatio: 1
        }
    });
    
    // Set background image using CSS
    gameCanvas.style.backgroundImage = `url(${BACKGROUND_IMAGE_PATH})`;
    gameCanvas.style.backgroundSize = 'cover';
    gameCanvas.style.backgroundPosition = 'center bottom';
    
    // Add window resize handler
    window.addEventListener('resize', () => {
        // Keep the same dimensions but update positions
        if (ground) {
            Body.setPosition(ground, {
                x: width / 2,
                y: height - GROUND_HEIGHT / 2
            });
        }
        
        // Update wall positions
        if (walls.length >= 2) {
            const wallThickness = 50;
            Body.setPosition(walls[0], {
                x: -wallThickness / 2,
                y: height / 2
            });
            Body.setPosition(walls[1], {
                x: width + wallThickness / 2,
                y: height / 2
            });
        }
    });
    
    // Create runner
    runner = Runner.create();
    
    // Create world
    createWorld();
    
    // Start the renderer and runner
    Render.run(render);
    Runner.run(runner, engine);
    
    // Set up event listeners
    setupEventListeners();
    
    // Load sounds
    loadSounds();
    
    // Create initial obstacles
    createInitialObstacles();
    
    // Create the first power-up after a delay
    setTimeout(createGiantSizePowerUp, 5000);
    
    // Game loop
    gameLoop();
    
    console.log("Game initialized successfully!");
}

// Create initial obstacles
function createInitialObstacles() {
    // Calculate screen dimensions for scaling
    const screenWidth = render.options.width;
    const screenHeight = render.options.height;
    const pileWidth = screenWidth * 0.25; // Pile takes 25% of screen width
    const pileHeight = screenHeight * 0.25; // Pile takes 25% of screen height
    
    // Position pile on the right side with some margin
    const startX = screenWidth - pileWidth - 100;
    const groundY = render.options.height - GROUND_HEIGHT;
    
    // Store current obstacles length to track new additions
    const startIndex = obstacles.length;
    
    // Create block pile
    createBlockPile(startX, groundY, pileWidth, pileHeight);
    
    // Store original positions of new obstacles
    for (let i = startIndex; i < obstacles.length; i++) {
        originalObstaclePositions.push({
            x: obstacles[i].position.x,
            y: obstacles[i].position.y,
            angle: obstacles[i].angle
        });
    }
    
    // Set flag to indicate initial obstacles have been created
    initialObstaclesCreated = true;
}

// New function to create a pile of rat ninjas
function createBlockPile(startX, groundY, width, height) {
    // Calculate block sizes - use half the PANDA_SIZE for consistent sizing
    const boxSize = PANDA_SIZE / 2;
    
    // Calculate how many boxes we need to fill the width
    const boxesPerRow = Math.floor(width / boxSize);
    
    // Create a more substantial pile that fills the allocated space
    
    // Bottom layer - fill the width
    for (let i = 0; i < boxesPerRow; i++) {
        createBox(
            startX + (i * boxSize),
            groundY - boxSize/2,
            boxSize,
            boxSize,
            null // Color is ignored now, using RatNinja image
        );
    }
    
    // Second layer - fill the width
    for (let i = 0; i < boxesPerRow; i++) {
        const box = createBox(
            startX + (i * boxSize),
            groundY - boxSize - boxSize/2,
            boxSize,
            boxSize,
            null
        );
        // Add slight rotation for visual interest
        Body.setAngle(box, (Math.random() - 0.5) * 0.5);
    }
    
    // Third layer - one less than width
    for (let i = 0; i < boxesPerRow - 1; i++) {
        const box = createBox(
            startX + boxSize/2 + (i * boxSize),
            groundY - boxSize*2 - boxSize/2,
            boxSize,
            boxSize,
            null
        );
        // Add slight rotation for visual interest
        Body.setAngle(box, (Math.random() - 0.5) * 0.5);
    }
    
    // Fourth layer - two less than width
    for (let i = 0; i < boxesPerRow - 2; i++) {
        const box = createBox(
            startX + boxSize + (i * boxSize),
            groundY - boxSize*3 - boxSize/2,
            boxSize,
            boxSize,
            null
        );
        // Add slight rotation for visual interest
        Body.setAngle(box, (Math.random() - 0.5) * 0.5);
    }
    
    // Top layer - three less than width
    if (boxesPerRow > 3) {
        for (let i = 0; i < boxesPerRow - 3; i++) {
            const topBox = createBox(
                startX + boxSize*1.5 + (i * boxSize),
                groundY - boxSize*4 - boxSize/2,
                boxSize,
                boxSize,
                null
            );
            // Add slight rotation for visual interest
            Body.setAngle(topBox, (Math.random() - 0.5) * 0.5);
        }
    }
    
    // Add some scattered blocks around the main pile
    const scatteredPositions = [
        { x: startX - boxSize*0.7, y: groundY - boxSize*0.6 },
        { x: startX + width + boxSize*0.2, y: groundY - boxSize*0.7 },
        { x: startX + boxSize*0.5, y: groundY - boxSize*2.5 },
        { x: startX + width - boxSize*0.5, y: groundY - boxSize*2.2 }
    ];
    
    scatteredPositions.forEach((pos, i) => {
        const box = createBox(
            pos.x,
            pos.y,
            boxSize,
            boxSize,
            null
        );
        // Add more rotation for scattered blocks
        Body.setAngle(box, (Math.random() - 0.5) * 1.5);
    });
}

// Load sound effects
function loadSounds() {
    // Create audio elements
    breakSound = new Audio();
    jumpSound = new Audio();
    powerUpSound = new Audio();
    
    // Set sources (these would be replaced with actual sound files)
    breakSound.src = 'about:blank';
    jumpSound.src = 'about:blank';
    powerUpSound.src = 'about:blank';
    
    // Preload sounds
    breakSound.load();
    jumpSound.load();
    powerUpSound.load();
}

// Create the game world
function createWorld() {
    console.log("Creating game world...");
    
    // Create walls with higher restitution and friction
    const wallThickness = 50;
    walls = [
        // Left wall
        Bodies.rectangle(
            -wallThickness / 2,
            render.options.height / 2,
            wallThickness,
            render.options.height,
            { 
                isStatic: true, 
                render: { 
                    fillStyle: 'rgba(76, 175, 80, 0.8)',
                    strokeStyle: '#2E7D32',
                    lineWidth: 1
                },
                restitution: 0.8, // Increased bounciness
                friction: 0.2 // Added friction to prevent sliding
            }
        ),
        // Right wall
        Bodies.rectangle(
            render.options.width + wallThickness / 2,
            render.options.height / 2,
            wallThickness,
            render.options.height,
            { 
                isStatic: true, 
                render: { 
                    fillStyle: 'rgba(76, 175, 80, 0.8)',
                    strokeStyle: '#2E7D32',
                    lineWidth: 1
                },
                restitution: 0.8, // Increased bounciness
                friction: 0.2 // Added friction to prevent sliding
            }
        )
    ];
    
    // Create ground
    ground = Bodies.rectangle(
        render.options.width / 2,
        render.options.height - GROUND_HEIGHT / 2,
        render.options.width * 2,
        GROUND_HEIGHT,
        { 
            isStatic: true,
            render: { 
                fillStyle: 'rgba(121, 85, 72, 0.8)', // Semi-transparent brown
                strokeStyle: '#5D4037',
                lineWidth: 1
            },
            friction: FRICTION_VALUE * 2, // Increased ground friction
            restitution: RESTITUTION
        }
    );
    
    // Create panda with improved physics properties but original size
    panda = Bodies.rectangle(
        100,
        render.options.height - GROUND_HEIGHT - PANDA_SIZE / 2,
        PANDA_SIZE,
        PANDA_SIZE,
        {
            density: 0.01, // Increased density for more stability
            frictionAir: 0.02, // Increased air friction to reduce vibration
            friction: 0.1, // Added friction to reduce sliding
            restitution: 0.2, // Reduced bounciness
            label: 'panda', // Add label for collision detection
            render: {
                sprite: {
                    texture: PANDA_IMAGE_PATH,
                    xScale: PANDA_SIZE / 400,
                    yScale: PANDA_SIZE / 400
                }
            },
            // Add inertia to prevent rotation
            inertia: Infinity
        }
    );
    
    // Add all bodies to the world
    World.add(engine.world, [ground, panda, ...walls]);
    
    // Set initial game state
    gameStarted = true;
    gameOver = false;
    score = 0;
    combo = 0;
    powerLevel = 1;
    
    // Update score display
    document.getElementById('score').textContent = `Score: ${score}`;
}

// Set up event listeners
function setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') keys.right = true;
        if (e.key === 'ArrowLeft') keys.left = true;
        if (e.key === 'ArrowUp' && !keys.up) {
            keys.up = true;
            
            // Play jump sound
            jumpSound.currentTime = 0;
            jumpSound.play().catch(() => {});
            
            // Give panda a more controlled upward boost
            Body.setVelocity(panda, { x: panda.velocity.x, y: -15 });
            
            // Apply explosive force to nearby obstacles
            applyExplosiveForce();
        }
        
        // Start game on first key press
        if (!gameStarted) {
            gameStarted = true;
        }
        
        // Restart game with 'R' key
        if (e.key === 'r' || e.key === 'R') {
            restartGame();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowRight') keys.right = false;
        if (e.key === 'ArrowLeft') keys.left = false;
        if (e.key === 'ArrowUp') keys.up = false;
    });
    
    // Update touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Prevent default touch behaviors
    document.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
    
    // Restart button - remove any existing event listeners first
    const restartBtn = document.getElementById('restart-btn');
    const newRestartBtn = restartBtn.cloneNode(true);
    restartBtn.parentNode.replaceChild(newRestartBtn, restartBtn);
    newRestartBtn.addEventListener('click', restartGame);
    
    // Collision events
    Events.on(engine, 'collisionStart', (event) => {
        const pairs = event.pairs;
        
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            
            // Check for power-up collection
            if ((pair.bodyA.label === 'panda' && pair.bodyB.label === 'power-up') ||
                (pair.bodyB.label === 'panda' && pair.bodyA.label === 'power-up')) {
                
                const powerUp = pair.bodyA.label === 'power-up' ? pair.bodyA : pair.bodyB;
                
                // Activate power-up
                activateGiantSizePowerUp();
                
                // Remove power-up from world
                World.remove(engine.world, powerUp);
                giantPowerUpPresent = false;
            }
            
            // Check if panda collided with an obstacle
            if ((pair.bodyA === panda || pair.bodyB === panda) && 
                (obstacles.includes(pair.bodyA) || obstacles.includes(pair.bodyB))) {
                
                const obstacle = pair.bodyA === panda ? pair.bodyB : pair.bodyA;
                
                // Calculate impact force based on panda's velocity
                const pandaVelocity = panda.velocity;
                const forceMagnitude = Math.sqrt(pandaVelocity.x * pandaVelocity.x + pandaVelocity.y * pandaVelocity.y);
                
                // Increased force multiplier for more dramatic movement
                const forceMultiplier = 0.05 * powerLevel;
                
                // Calculate impact angle
                const impactAngle = Math.atan2(obstacle.position.y - panda.position.y, 
                                              obstacle.position.x - panda.position.x);
                
                // Apply strong force in the impact direction
                Body.setVelocity(obstacle, {
                    x: Math.cos(impactAngle) * forceMagnitude * forceMultiplier * 2,
                    y: Math.sin(impactAngle) * forceMagnitude * forceMultiplier * 2
                });
                
                // Add slight spin for visual interest while keeping block stable
                Body.setAngularVelocity(obstacle, (Math.random() - 0.5) * 0.1);
                
                // Play break sound
                breakSound.currentTime = 0;
                breakSound.play().catch(() => {});
                
                // Update score and combo as before
                if (forceMagnitude > 5) {
                    const points = Math.floor(forceMagnitude * powerLevel);
                    increaseScore(points);
                    
                    combo++;
                    comboTimer = Date.now();
                    
                    if (combo % 5 === 0 && powerLevel < 3) {
                        powerLevel++;
                        powerUpSound.currentTime = 0;
                        powerUpSound.play().catch(() => {});
                        showMessage(`POWER UP! x${powerLevel}`);
                    }
                }
            }
        }
    });
}

// Handle touch start
function handleTouchStart(evt) {
    evt.preventDefault();
    const firstTouch = evt.touches[0];
    touchStartX = firstTouch.clientX;
    touchStartY = firstTouch.clientY;
    touchCenterX = touchStartX; // Set center point for relative movement
    touchActive = true;
    
    // Start game on first touch
    if (!gameStarted) {
        gameStarted = true;
    }
}

// Handle touch move
function handleTouchMove(evt) {
    evt.preventDefault();
    if (!touchActive) return;

    touchEndX = evt.touches[0].clientX;
    touchEndY = evt.touches[0].clientY;

    // Calculate horizontal distance from touch start
    const horizontalDiff = touchEndX - touchCenterX;

    // Apply movement based on touch position
    if (Math.abs(horizontalDiff) > TOUCH_DEADZONE) {
        // Moving right
        if (horizontalDiff > 0) {
            keys.right = true;
            keys.left = false;
            // Apply force proportional to distance
            const force = Math.min(Math.abs(horizontalDiff) * TOUCH_SENSITIVITY, MAX_SPEED);
            Body.setVelocity(panda, { 
                x: force, 
                y: panda.velocity.y 
            });
        } 
        // Moving left
        else {
            keys.left = true;
            keys.right = false;
            // Apply force proportional to distance
            const force = Math.min(Math.abs(horizontalDiff) * TOUCH_SENSITIVITY, MAX_SPEED);
            Body.setVelocity(panda, { 
                x: -force, 
                y: panda.velocity.y 
            });
        }
    } else {
        // Within deadzone - stop horizontal movement
        keys.right = false;
        keys.left = false;
    }

    // Check for upward swipe (jump)
    const verticalDiff = touchEndY - touchStartY;
    if (verticalDiff < -SWIPE_THRESHOLD && !keys.up) {
        keys.up = true;
        // Give panda a more controlled upward boost
        Body.setVelocity(panda, { 
            x: panda.velocity.x, 
            y: -15 
        });
        // Apply explosive force to nearby obstacles
        applyExplosiveForce();
        // Play jump sound
        jumpSound.currentTime = 0;
        jumpSound.play().catch(() => {});
        
        // Reset vertical touch start to prevent multiple jumps
        touchStartY = touchEndY;
    }
}

// Handle touch end
function handleTouchEnd(evt) {
    evt.preventDefault();
    touchActive = false;
    
    // Reset all touch-triggered keys
    keys.left = false;
    keys.right = false;
    keys.up = false;
    
    // Reset touch coordinates
    touchStartX = 0;
    touchStartY = 0;
    touchEndX = 0;
    touchEndY = 0;
}

// Show message
function showMessage(text) {
    const message = document.createElement('div');
    message.className = 'game-message';
    message.textContent = text;
    message.style.position = 'absolute';
    message.style.top = '50%';
    message.style.left = '50%';
    message.style.transform = 'translate(-50%, -50%)';
    message.style.color = '#FF5722';
    message.style.fontSize = '32px';
    message.style.fontWeight = 'bold';
    message.style.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)';
    message.style.zIndex = '100';
    
    document.getElementById('game-canvas').appendChild(message);
    
    // Remove after animation
    setTimeout(() => {
        message.style.transition = 'opacity 0.5s, transform 0.5s';
        message.style.opacity = '0';
        message.style.transform = 'translate(-50%, -100%)';
        
        setTimeout(() => {
            message.remove();
        }, 500);
    }, 1000);
}

// Game loop
function gameLoop() {
    if (!gameOver) {
        // Handle player movement
        handlePlayerMovement();
        
        // Update combo
        if (combo > 0 && Date.now() - comboTimer > COMBO_TIMEOUT) {
            combo = 0;
            powerLevel = 1;
        }
        
        // Check if power-up has expired
        if (powerUpActive && Date.now() >= powerUpEndTime) {
            deactivateGiantSizePowerUp();
            // Create a new power-up after expiration
            setTimeout(createGiantSizePowerUp, 5000);
        }
        
        // Check if all blocks are off screen
        checkAndResetBlocks();
        
        requestAnimationFrame(gameLoop);
    }
}

// Handle player movement
function handlePlayerMovement() {
    if (!gameStarted) return;
    
    // Keep panda within screen bounds
    const horizontalMargin = PANDA_SIZE / 2;
    const verticalMargin = PANDA_SIZE / 2;
    
    // Horizontal bounds
    if (panda.position.x < horizontalMargin) {
        Body.setPosition(panda, { x: horizontalMargin, y: panda.position.y });
        Body.setVelocity(panda, { x: Math.abs(panda.velocity.x) * 0.8, y: panda.velocity.y });
    }
    if (panda.position.x > render.options.width - horizontalMargin) {
        Body.setPosition(panda, { x: render.options.width - horizontalMargin, y: panda.position.y });
        Body.setVelocity(panda, { x: -Math.abs(panda.velocity.x) * 0.8, y: panda.velocity.y });
    }
    
    // Vertical bounds
    if (panda.position.y < verticalMargin) {
        Body.setPosition(panda, { x: panda.position.x, y: verticalMargin });
        Body.setVelocity(panda, { x: panda.velocity.x, y: Math.abs(panda.velocity.y) * 0.5 });
    }
    if (panda.position.y > render.options.height - GROUND_HEIGHT - verticalMargin) {
        Body.setPosition(panda, { x: panda.position.x, y: render.options.height - GROUND_HEIGHT - verticalMargin });
        Body.setVelocity(panda, { x: panda.velocity.x, y: Math.min(panda.velocity.y, 0) });
    }
    
    // Limit vertical speed
    if (Math.abs(panda.velocity.y) > MAX_VERTICAL_SPEED) {
        Body.setVelocity(panda, {
            x: panda.velocity.x,
            y: Math.sign(panda.velocity.y) * MAX_VERTICAL_SPEED
        });
    }

    // Handle keyboard movement if touch is not active
    if (!touchActive) {
        // Apply horizontal movement force for keyboard controls
        if (keys.right) {
            const currentSpeed = panda.velocity.x;
            if (currentSpeed < MAX_SPEED) {
                Body.applyForce(panda, panda.position, { x: ACCELERATION, y: 0 });
            }
        } else if (keys.left) {
            const currentSpeed = panda.velocity.x;
            if (currentSpeed > -MAX_SPEED) {
                Body.applyForce(panda, panda.position, { x: -ACCELERATION, y: 0 });
            }
        } else {
            // When idle, completely stop horizontal movement if velocity is small
            if (Math.abs(panda.velocity.x) <= 0.5) {
                Body.setVelocity(panda, { x: 0, y: panda.velocity.y });
                // Also set angular velocity to 0 to prevent rotation
                Body.setAngularVelocity(panda, 0);
            } else {
                // Apply stronger friction when not pressing movement keys to prevent drift
                const frictionDirection = panda.velocity.x > 0 ? -1 : 1;
                Body.applyForce(panda, panda.position, { x: FRICTION * 5 * frictionDirection, y: 0 });
            }
        }
    }
    
    // Apply continuous upward force while up key is held
    if (keys.up) {
        // Only apply upward force if not at top of screen
        if (panda.position.y > verticalMargin * 2) {
            Body.applyForce(panda, panda.position, { x: 0, y: CONTINUOUS_JUMP_FORCE });
        }
        
        // Periodically apply explosive force to nearby blocks while up is held
        if (Math.random() < 0.1) { // 10% chance each frame
            applyExplosiveForce();
        }
        
        // Reduce downward velocity if moving down
        if (panda.velocity.y > 0) {
            Body.setVelocity(panda, {
                x: panda.velocity.x,
                y: panda.velocity.y * 0.8 // Reduce downward velocity
            });
        }
    }
    
    // Visual effect: rotate panda based on velocity
    const speed = Vector.magnitude(panda.velocity);
    if (speed > 5) {
        const angle = Math.min(Math.PI / 12, speed / 30);
        // Flip angle based on direction
        Body.setAngle(panda, panda.velocity.x >= 0 ? angle : -angle);
    } else {
        // Keep panda upright when not moving fast
        Body.setAngle(panda, 0);
    }
}

// Check if panda is on the ground
function isOnGround() {
    const groundY = render.options.height - GROUND_HEIGHT;
    return panda.position.y >= groundY - PANDA_SIZE / 2 - 2; // Small tolerance
}

// Create obstacle stack
function createObstacle() {
    const obstacleX = render.options.width - 200;
    const groundY = render.options.height - GROUND_HEIGHT;
    
    // Randomly choose obstacle type
    const obstacleType = Math.floor(Math.random() * 3);
    
    switch (obstacleType) {
        case 0:
            // Stack of boxes
            createBoxStack(obstacleX, groundY);
            break;
        case 1:
            // Pyramid
            createPyramid(obstacleX, groundY);
            break;
        case 2:
            // Wall
            createWall(obstacleX, groundY);
            break;
    }
}

// Create a stack of boxes
function createBoxStack(x, groundY) {
    const boxSize = PANDA_SIZE / 2; // Half the size of the panda
    const rows = 3;
    const cols = 3;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const box = createBox(
                x + col * boxSize,
                groundY - (row + 0.5) * boxSize,
                boxSize,
                boxSize,
                null // Using RatNinja image
            );
            // Add slight rotation for visual interest
            Body.setAngle(box, (Math.random() - 0.5) * 0.3);
        }
    }
}

// Create a pyramid of boxes
function createPyramid(x, groundY) {
    const boxSize = PANDA_SIZE / 2; // Half the size of the panda
    const rows = 4;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col <= row; col++) {
            const box = createBox(
                x + (col - row/2) * boxSize,
                groundY - (row + 0.5) * boxSize,
                boxSize,
                boxSize,
                null // Using RatNinja image
            );
            // Add slight rotation for visual interest
            Body.setAngle(box, (Math.random() - 0.5) * 0.3);
        }
    }
}

// Create a wall of boxes
function createWall(x, groundY) {
    const boxSize = PANDA_SIZE / 2; // Half the size of the panda
    const rows = 5;
    const cols = 2;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const box = createBox(
                x + col * boxSize,
                groundY - (row + 0.5) * boxSize,
                boxSize,
                boxSize,
                null // Using RatNinja image
            );
            // Add slight rotation for visual interest
            Body.setAngle(box, (Math.random() - 0.5) * 0.2);
        }
    }
}

// Create a box with the RatNinja image
function createBox(x, y, width, height, color) {
    // Make the rat ninja half the size of the hero
    const ratSize = PANDA_SIZE / 2;
    
    const box = Bodies.rectangle(x, y, ratSize, ratSize, {
        density: DENSITY,
        friction: FRICTION_VALUE,
        frictionAir: AIR_FRICTION,
        restitution: RESTITUTION,
        render: {
            sprite: {
                texture: RAT_NINJA_IMAGE_PATH,
                xScale: ratSize / 400, // Scale proportionally to the rat size
                yScale: ratSize / 400  // Scale proportionally to the rat size
            }
        }
    });
    
    // Add to obstacles array and world
    obstacles.push(box);
    World.add(engine.world, box);
    
    return box;
}

// Increase score
function increaseScore(points) {
    score += points;
    document.getElementById('score').textContent = `Score: ${score} | Combo: ${combo}`;
}

// Restart game
function restartGame() {
    console.log("Restarting game...");
    
    // Clear original positions
    originalObstaclePositions = [];
    
    // Stop the game loop if it's running
    if (gameOver) {
        gameOver = false;
        // Restart the game loop
        requestAnimationFrame(gameLoop);
    }
    
    // Clear world
    World.clear(engine.world);
    
    // Remove all event listeners from the engine to prevent duplicates
    Events.off(engine);
    
    // Reset variables
    obstacles = [];
    score = 0;
    gameStarted = false;
    gameOver = false;
    lastObstacleTime = 0;
    combo = 0;
    comboTimer = 0;
    powerLevel = 1;
    initialObstaclesCreated = false;
    
    // Reset score display
    document.getElementById('score').textContent = `Score: ${score}`;
    
    // Recreate world
    createWorld();
    
    // Set up event listeners again
    setupEventListeners();
    
    // Create initial obstacles
    createInitialObstacles();
    
    console.log("Game restarted successfully!");
}

// New function to apply explosive force
function applyExplosiveForce() {
    const searchRadius = EXPLOSIVE_RADIUS;
    const bodies = Query.region(obstacles, {
        min: { x: panda.position.x - searchRadius, y: panda.position.y - searchRadius },
        max: { x: panda.position.x + searchRadius, y: panda.position.y + searchRadius }
    });
    
    bodies.forEach(obstacle => {
        const dx = obstacle.position.x - panda.position.x;
        const dy = obstacle.position.y - panda.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < searchRadius) {
            const force = (1 - distance / searchRadius) * EXPLOSIVE_FORCE;
            const angle = Math.atan2(dy, dx);
            
            // Stronger upward force for all blocks
            const upwardBias = -1.5;
            
            Body.setVelocity(obstacle, {
                x: Math.cos(angle) * force * 50,
                y: (Math.sin(angle) + upwardBias) * force * 50
            });
            
            // Add more dramatic rotation
            Body.setAngularVelocity(obstacle, (Math.random() - 0.5) * 1.2);
        }
    });
}

// New function to check and reset blocks
function checkAndResetBlocks() {
    if (obstacles.length === 0) return;
    
    let allBlocksOffScreen = true;
    const margin = 100; // Buffer zone outside screen
    
    // Check if all blocks are off screen
    for (let obstacle of obstacles) {
        if (obstacle.position.x > -margin &&
            obstacle.position.x < render.options.width + margin &&
            obstacle.position.y > -margin &&
            obstacle.position.y < render.options.height + margin) {
            allBlocksOffScreen = false;
            break;
        }
    }
    
    // If all blocks are off screen, reset them
    if (allBlocksOffScreen) {
        resetBlocks();
    }
}

// New function to reset blocks
function resetBlocks() {
    // Show reset message
    showMessage("BLOCKS RESETTING!");
    
    // Reset each block to its original position with animation
    obstacles.forEach((obstacle, index) => {
        const originalPos = originalObstaclePositions[index];
        if (originalPos) {
            // Stop all motion
            Body.setVelocity(obstacle, { x: 0, y: 0 });
            Body.setAngularVelocity(obstacle, 0);
            
            // Reset position and angle
            Body.setPosition(obstacle, { x: originalPos.x, y: originalPos.y });
            Body.setAngle(obstacle, originalPos.angle);
            
            // Add slight random offset for visual interest
            Body.setVelocity(obstacle, {
                x: (Math.random() - 0.5) * 2,
                y: -Math.random() * 2
            });
        }
    });
    
    // Play power up sound for feedback
    powerUpSound.currentTime = 0;
    powerUpSound.play().catch(() => {});
}

// Create a Giant Size power-up
function createGiantSizePowerUp() {
    // Only create if game has started and no power-up is active
    if (!gameStarted || powerUpActive || giantPowerUpPresent) return;
    
    // Random position within game bounds, but not too close to edges
    const margin = 100;
    const x = Math.random() * (render.options.width - margin * 2) + margin;
    const y = Math.random() * (render.options.height - GROUND_HEIGHT - margin * 2) + margin;
    
    // Create power-up body with larger size
    const powerUp = Bodies.circle(x, y, 25, {
        isStatic: true,
        isSensor: true,
        render: {
            fillStyle: '#FFD700', // Gold color
            strokeStyle: '#FFA500', // Orange outline
            lineWidth: 3
        },
        label: 'power-up',
        powerUpType: GIANT_SIZE
    });
    
    // Add to world
    World.add(engine.world, powerUp);
    giantPowerUpPresent = true;
    
    // Remove after some time if not collected
    setTimeout(() => {
        if (World.contains(engine.world, powerUp)) {
            World.remove(engine.world, powerUp);
            // Only create another power-up if no power-up is active
            if (!powerUpActive) {
                setTimeout(createGiantSizePowerUp, 5000);
            }
            giantPowerUpPresent = false;
        }
    }, 10000); // 10 seconds
}

// Activate Giant Size power-up
function activateGiantSizePowerUp() {
    if (powerUpActive === true) {
        return;
    }

    // Play power-up sound
    powerUpSound.currentTime = 0;
    powerUpSound.play().catch(() => {});
    
    // Set power-up state
    powerUpActive = true;
    powerUpEndTime = Date.now() + POWER_UP_DURATION;
    
    // Show message
    showMessage("Giant Size activated!");
    
    // Store original size
    originalPandaSize = PANDA_SIZE;
    
    // Double the panda's size
    Body.scale(panda, 2, 2);
    
    // Update render properties
    if (panda.render && panda.render.sprite) {
        panda.render.sprite.xScale *= 2;
        panda.render.sprite.yScale *= 2;
    }
}

// Deactivate Giant Size power-up
function deactivateGiantSizePowerUp() {
    // Scale back to original size
    Body.scale(panda, 0.5, 0.5);
    
    // Update render properties
    if (panda.render && panda.render.sprite) {
        panda.render.sprite.xScale *= 0.5;
        panda.render.sprite.yScale *= 0.5;
    }
    
    // Reset power-up state
    powerUpActive = false;
    
    // Show message
    showMessage("Giant Size expired!");
    
    // Create a new power-up after a delay
    setTimeout(createGiantSizePowerUp, 5000);
}

// Initialize game when page loads
window.addEventListener('load', () => {
    console.log("Page loaded, initializing game...");
    // Initialize game directly
    init();
}); 