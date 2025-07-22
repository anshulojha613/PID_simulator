/**
 * BalancingRobot - A physics-based simulation of a Segway-style balancing robot
 */
class BalancingRobot {
    /**
     * Create a new BalancingRobot instance
     * @param {HTMLCanvasElement} canvas - The canvas element to render on
     * @param {PIDController} pidController - The PID controller instance to use
     */
    constructor(canvas, pidController) {
        if (!canvas) {
            throw new Error('Canvas element is required');
        }
        
        if (!pidController || !(pidController instanceof window.PIDController)) {
            console.warn('No valid PID controller provided, creating default one');
            pidController = new window.PIDController(2.5, 0.1, 0.8);
        }
        console.log('Initializing BalancingRobot with canvas:', canvas.id || 'unnamed-canvas');
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.pidController = pidController;
        
        if (!this.ctx) {
            throw new Error('Failed to get 2D context from canvas');
        }
        
        // Physical properties
        this.mass = 1.0; // kg
        this.length = 0.5; // meters (half-length of pendulum)
        this.gravity = 9.81; // m/s²
        this.friction = 0.1; // damping coefficient
        
        // State variables
        this.angle = 0; // radians from vertical
        this.angularVelocity = 0; // rad/s
        this.angularAcceleration = 0; // rad/s²
        this.position = 0; // horizontal position for movement
        this.velocity = 0; // horizontal velocity
        
        // Position for rendering
        this.baseX = canvas.width / 2;
        this.baseY = canvas.height - 100;
        this.scale = 200; // pixels per meter
        
        // Control input
        this.torque = 0; // Applied torque from PID controller
        
        // Disturbances
        this.disturbanceForce = 0;
        this.disturbanceDecay = 0.95;
        
        // Animation
        this.lastTime = Date.now();
        
        // Visual elements - Segway style
        this.wheelRadius = 30;
        this.platformWidth = 120;
        this.platformHeight = 20;
        this.bodyWidth = 80;
        this.bodyHeight = 120;
        this.handlebarWidth = 100;
        this.handlebarHeight = 10;
        
        // Ground movement
        this.groundOffset = 0;
        this.groundSpeed = 0;
        
        // Trail for showing movement
        this.trail = [];
        this.maxTrailLength = 100;
    }
    
    reset() {
        // Reset physics state
        this.angle = 0; // Start upright
        this.angularVelocity = 0;
        this.angularAcceleration = 0;
        this.position = 0; // Keep robot centered
        this.velocity = 0;
        this.torque = 0;
        this.disturbanceForce = 0;
        
        // Reset ground animation
        this.groundOffset = 0;
        this.groundSpeed = 0;
        
        // Clear trail and reset timing
        this.trail = [];
        this.lastTime = Date.now();
        
        // Reset PID controller if available
        if (this.pidController && typeof this.pidController.reset === 'function') {
            this.pidController.reset();
        }
        
        console.log('Simulation reset to initial state');
    }
    
    applyDisturbance(force = 5) {
        this.disturbanceForce = force;
    }
    
    setTorque(torque) {
        this.torque = torque;
    }
    
    update() {
        const currentTime = Date.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap delta time
        this.lastTime = currentTime;
        
        if (isNaN(deltaTime) || deltaTime <= 0) {
            console.warn('Invalid deltaTime:', deltaTime);
            return;
        }
        
        // Physics simulation using inverted pendulum model
        // Constants for physics
        const g = this.gravity; // gravity
        const l = this.length;  // length to center of mass
        const m = this.mass;    // mass
        const b = this.friction; // damping coefficient
        
        // Calculate angular acceleration (simplified inverted pendulum)
        const gravityTerm = (g / l) * Math.sin(this.angle);
        const dampingTerm = (b / (m * l * l)) * this.angularVelocity;
        const controlTerm = this.torque / (m * l * l);
        const disturbanceTerm = this.disturbanceForce / (m * l * l);
        
        this.angularAcceleration = gravityTerm - dampingTerm + controlTerm + disturbanceTerm;
        
        // Integrate angular velocity and angle
        this.angularVelocity += this.angularAcceleration * deltaTime;
        this.angle += this.angularVelocity * deltaTime;
        
        // Calculate speed based on angle (robot leans to move)
        // This creates a more realistic Segway-like behavior
        const targetSpeed = Math.sin(this.angle) * 5; // Scale factor for speed
        const acceleration = (targetSpeed - this.velocity) * 2.0; // Smoothing factor
        
        // Update velocity with acceleration and apply friction
        this.velocity += acceleration * deltaTime;
        this.velocity *= 0.98; // Ground friction
        
        // Update ground movement based on velocity
        // The robot stays centered while the ground moves
        this.groundSpeed = -this.velocity * 20; // Scale factor for ground movement
        this.groundOffset = (this.groundOffset + this.groundSpeed * deltaTime) % 100;
        
        // Apply disturbance decay
        this.disturbanceForce *= this.disturbanceDecay;
        
        // Limit angle to prevent complete flip (safety)
        this.angle = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.angle));
        
        // Add current position to trail (use angle and velocity for trail position)
        const trailX = this.baseX + Math.sin(this.angle) * 50; // Scale factor for trail spread
        this.trail.push({ x: trailX, y: this.baseY + 20, time: currentTime });
        
        // Limit trail length
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Remove old trail points
        const trailTimeout = 3000; // 3 seconds
        this.trail = this.trail.filter(point => currentTime - point.time < trailTimeout);
    }
    
    render() {
        const ctx = this.ctx;
        
        if (!ctx) {
            console.error('No canvas context available for rendering');
            return;
        }
        
        // Clear the canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw a light background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update base positions (robot is always centered horizontally)
        this.baseX = this.canvas.width / 2;
        this.baseY = this.canvas.height - 80; // Position above bottom
        
        // Draw debug elements (optional)
        if (false) { // Set to true to show debug elements
            this.drawCoordinateSystem();
            this.drawGrid();
        }
        
        // Draw the trail first (behind the robot)
        this.drawTrail();
        
        // Draw ground with movement (pass the ground offset for texture animation)
        this.drawGround(this.groundOffset);
        
        // Save context for robot drawing
        ctx.save();
        
        // Position at the robot's base (center bottom)
        const wheelY = this.baseY;
        
        // Draw the robot
        this.drawWheels();
        this.drawPlatform();
        this.drawSegwayBody();
        
        // Draw angle indicator (shows lean direction)
        this.drawAngleIndicator(this.baseX, wheelY);
        
        // Draw target line (vertical line showing target balance point)
        this.drawTargetLine();
        
        // Restore context
        ctx.restore();
        
        // Debug info (optional)
        if (false) { // Set to true to show debug info
            ctx.fillStyle = '#000';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`Angle: ${this.angle.toFixed(2)} rad`, 10, 20);
            ctx.fillText(`Angular Vel: ${this.angularVelocity.toFixed(2)} rad/s`, 10, 40);
            ctx.fillText(`Velocity: ${this.velocity.toFixed(2)}`, 10, 60);
        }
    }
    
    drawGround(groundOffset) {
        const ctx = this.ctx;
        const groundY = this.baseY + this.wheelRadius + 5; // Position just below wheels
        const groundHeight = this.canvas.height - groundY;
        
        // Ground fill (darker brown)
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(0, groundY, this.canvas.width, groundHeight);
        
        // Ground texture (lighter brown lines)
        ctx.strokeStyle = '#8D6E63';
        ctx.lineWidth = 2;
        
        // Draw horizontal lines for texture
        for (let y = groundY + 5; y < this.canvas.height; y += 15) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
        
        // Draw perspective lines that move with groundOffset
        ctx.strokeStyle = '#A1887F';
        for (let x = -groundOffset % 60; x < this.canvas.width; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, groundY);
            ctx.lineTo(x + 30, groundY + 30);
            ctx.stroke();
        }
        
        // Draw center line (yellow dashed)
        ctx.strokeStyle = '#FFD54F';
        ctx.setLineDash([30, 20]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, groundY + 8);
        ctx.lineTo(this.canvas.width, groundY + 8);
    }
        
    drawWheels() {
        const ctx = this.ctx;
        const wheelY = 0; // Wheels are at y=0 in the current coordinate system
        
        // Draw left wheel
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(-this.platformWidth/2, wheelY, this.wheelRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw right wheel
        ctx.beginPath();
        ctx.arc(this.platformWidth/2, wheelY, this.wheelRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw wheel hubs (center of wheels)
        ctx.fillStyle = '#666';
        [-1, 1].forEach(side => {
            ctx.beginPath();
            ctx.arc(side * this.platformWidth/2, wheelY, this.wheelRadius/3, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Add tire treads
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI/4) {
            const y1 = wheelY + Math.sin(angle) * (this.wheelRadius - 2);
            const y2 = wheelY + Math.sin(angle) * this.wheelRadius;
            
            // Left wheel treads
            const x1 = -this.platformWidth/2 + Math.cos(angle) * (this.wheelRadius - 2);
            const x2 = -this.platformWidth/2 + Math.cos(angle) * this.wheelRadius;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            
            // Right wheel treads
            const x3 = this.platformWidth/2 + Math.cos(angle) * (this.wheelRadius - 2);
            const x4 = this.platformWidth/2 + Math.cos(angle) * this.wheelRadius;
            
            ctx.beginPath();
            ctx.moveTo(x3, y1);
            ctx.lineTo(x4, y2);
            ctx.stroke();
        }
    }
    
    drawPlatform() {
        // Platform base
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(-this.platformWidth/2, -this.platformHeight, this.platformWidth, this.platformHeight);
        
        // Platform highlights
        this.ctx.strokeStyle = '#888';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-this.platformWidth/2, -this.platformHeight, this.platformWidth, this.platformHeight);
    }
    
    drawSegwayBody() {
        // Save context for rotation
        this.ctx.save();
        
        // Apply rotation based on angle
        this.ctx.rotate(this.angle);
        
        // Body
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(-this.bodyWidth/2, -this.bodyHeight, this.bodyWidth, this.bodyHeight);
        
        // Body details
        this.ctx.strokeStyle = '#2E7D32';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-this.bodyWidth/2, -this.bodyHeight, this.bodyWidth, this.bodyHeight);
        
        // Handlebar
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(-this.handlebarWidth/2, -this.bodyHeight - 5, this.handlebarWidth, this.handlebarHeight);
        
        // Display face based on stability
        this.ctx.fillStyle = '#FFF';
        this.ctx.beginPath();
        
        // Eyes
        this.ctx.arc(-15, -this.bodyHeight + 30, 5, 0, Math.PI * 2);
        this.ctx.arc(15, -this.bodyHeight + 30, 5, 0, Math.PI * 2);
        
        // Mouth (smile or frown based on stability)
        this.ctx.moveTo(-15, -this.bodyHeight + 50);
        if (Math.abs(this.angle) < 0.2) {
            // Happy face when stable
            this.ctx.quadraticCurveTo(0, -this.bodyHeight + 60, 15, -this.bodyHeight + 50);
        } else {
            // Worried face when unstable
            this.ctx.quadraticCurveTo(0, -this.bodyHeight + 40, 15, -this.bodyHeight + 50);
        }
        
        this.ctx.fill();
        this.ctx.strokeStyle = '#FFF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawAngleIndicator(x, y) {
        const indicatorX = 100;
        const indicatorY = 100;
        const radius = 30;
        
        // Background circle
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(indicatorX, indicatorY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
        
        // Angle arc (color based on stability)
        const angleDegrees = this.angle * 180 / Math.PI;
        let indicatorColor;
        if (Math.abs(angleDegrees) < 5) {
            indicatorColor = '#4CAF50'; // Green for stable
        } else if (Math.abs(angleDegrees) < 15) {
            indicatorColor = '#FFC107'; // Yellow for warning
        } else {
            indicatorColor = '#F44336'; // Red for unstable
        }
        
        this.ctx.strokeStyle = indicatorColor;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(indicatorX, indicatorY, radius, -Math.PI/2, -Math.PI/2 + this.angle);
        this.ctx.stroke();
        
        // Center dot
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(indicatorX, indicatorY, 3, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Angle text with color indicator
        this.ctx.fillStyle = indicatorColor;
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${angleDegrees.toFixed(1)}°`, indicatorX, indicatorY + 50);
    }
    
    drawTargetLine() {
        // Draw vertical line at target position (0 degrees)
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.baseX, this.baseY);
        this.ctx.lineTo(this.baseX, this.baseY - 200);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Target label
        this.ctx.fillStyle = '#ff0000';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Target', this.baseX, this.baseY - 210);
    }
    
    /**
     * Draws a coordinate system for debugging purposes
     */
    drawCoordinateSystem() {
        const ctx = this.ctx;
        const centerX = this.baseX;
        const centerY = this.baseY;
        const length = 100;
        const arrowSize = 10;
        
        // Save context
        ctx.save();
        
        // Draw X axis (horizontal)
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - length, centerY);
        ctx.lineTo(centerX + length, centerY);
        // Arrow head for X axis
        ctx.moveTo(centerX + length - arrowSize, centerY - arrowSize);
        ctx.lineTo(centerX + length, centerY);
        ctx.lineTo(centerX + length - arrowSize, centerY + arrowSize);
        
        // Draw Y axis (vertical, inverted because canvas Y increases downward)
        ctx.moveTo(centerX, centerY + length);
        ctx.lineTo(centerX, centerY - length);
        // Arrow head for Y axis
        ctx.moveTo(centerX - arrowSize, centerY - length + arrowSize);
        ctx.lineTo(centerX, centerY - length);
        ctx.lineTo(centerX + arrowSize, centerY - length + arrowSize);
        
        ctx.stroke();
        
        // Add labels
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('X', centerX + length + 15, centerY);
        ctx.textBaseline = 'bottom';
        ctx.fillText('Y', centerX, centerY - length - 5);
        
        // Add center point
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Restore context
        ctx.restore();
    }
    
    /**
     * Draws a grid background for better spatial reference
     */
    drawGrid() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const gridSize = 40; // pixels between grid lines
        
        // Save context
        ctx.save();
        
        // Set grid style
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        ctx.lineWidth = 0.5;
        
        // Draw vertical grid lines
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Draw center lines (darker)
        ctx.strokeStyle = 'rgba(150, 150, 150, 0.5)';
        ctx.lineWidth = 1;
        
        // Vertical center line
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.stroke();
        
        // Horizontal center line (at base of robot)
        ctx.beginPath();
        ctx.moveTo(0, this.baseY);
        ctx.lineTo(width, this.baseY);
        ctx.stroke();
        
        // Restore context
        ctx.restore();
    }
    
    /**
     * Draws a trail showing the robot's movement path
     */
    drawTrail() {
        if (this.trail.length < 2) return;
        
        const ctx = this.ctx;
        const baseY = this.baseY;
        
        // Save context
        ctx.save();
        
        // Set trail style
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Draw the trail
        ctx.beginPath();
        const firstPoint = this.trail[0];
        ctx.moveTo(firstPoint.x, firstPoint.y);
        
        for (let i = 1; i < this.trail.length; i++) {
            const point = this.trail[i];
            ctx.lineTo(point.x, point.y);
        }
        
        ctx.stroke();
        
        // Add a gradient effect to show direction
        const gradient = ctx.createLinearGradient(
            this.trail[0].x, this.trail[0].y,
            this.trail[this.trail.length - 1].x,
            this.trail[this.trail.length - 1].y
        );
        
        gradient.addColorStop(0, 'rgba(0, 150, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(0, 150, 255, 0.6)');
        
        // Draw the gradient trail
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 6;
        
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        
        for (let i = 1; i < this.trail.length; i++) {
            const point = this.trail[i];
            ctx.lineTo(point.x, point.y);
        }
        
        ctx.stroke();
        
        // Restore context
        ctx.restore();
    }
    
    getAngleDegrees() {
        return this.angle * 180 / Math.PI;
    }
    
    getState() {
        return {
            angle: this.angle,
            angleDegrees: this.getAngleDegrees(),
            angularVelocity: this.angularVelocity,
            angularAcceleration: this.angularAcceleration,
            torque: this.torque,
            position: this.position,
            velocity: this.velocity
        };
    }
}

// Export the BalancingRobot class to the global scope
if (typeof window !== 'undefined') {
    window.BalancingRobot = BalancingRobot;
    
    // Add utility methods to the global scope
    window.BalancingRobot.createDefault = function(canvas) {
        if (!canvas) {
            console.error('Cannot create default BalancingRobot: No canvas provided');
            return null;
        }
        
        try {
            const pidController = new window.PIDController(2.5, 0.1, 0.8);
            return new BalancingRobot(canvas, pidController);
        } catch (error) {
            console.error('Failed to create default BalancingRobot:', error);
            return null;
        }
    };
    
    console.log('BalancingRobot exported to window with createDefault utility');
}

// For Node.js/CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BalancingRobot;
}
