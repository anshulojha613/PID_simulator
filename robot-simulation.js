class BalancingRobot {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
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
        this.angle = Math.random() * 0.2 - 0.1; // Small random initial angle
        this.angularVelocity = 0;
        this.angularAcceleration = 0;
        this.position = 0;
        this.velocity = 0;
        this.torque = 0;
        this.disturbanceForce = 0;
        this.groundOffset = 0;
        this.groundSpeed = 0;
        this.trail = [];
        this.lastTime = Date.now();
    }
    
    applyDisturbance(force = 5) {
        this.disturbanceForce = force;
    }
    
    setTorque(torque) {
        this.torque = torque;
    }
    
    update() {
        const currentTime = Date.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.02); // Cap at 50fps
        this.lastTime = currentTime;
        
        if (deltaTime <= 0) return;
        
        // Physics simulation using simplified inverted pendulum model
        // Equation: θ'' = (g/L)sin(θ) - (friction/mL²)θ' + (torque/mL²)
        
        const gravityTerm = (this.gravity / this.length) * Math.sin(this.angle);
        const frictionTerm = (this.friction / (this.mass * this.length * this.length)) * this.angularVelocity;
        const controlTerm = this.torque / (this.mass * this.length * this.length);
        const disturbanceTerm = this.disturbanceForce / (this.mass * this.length * this.length);
        
        // Calculate angular acceleration
        this.angularAcceleration = gravityTerm - frictionTerm + controlTerm + disturbanceTerm;
        
        // Integrate to get velocity and position
        this.angularVelocity += this.angularAcceleration * deltaTime;
        this.angle += this.angularVelocity * deltaTime;
        
        // Calculate horizontal movement based on angle and velocity
        const horizontalAcceleration = Math.sin(this.angle) * this.gravity * 0.5;
        this.velocity += horizontalAcceleration * deltaTime;
        this.velocity *= 0.98; // Ground friction
        this.position += this.velocity * deltaTime;
        
        // Update ground movement based on robot movement
        this.groundSpeed = -this.velocity * 0.3; // Scale down ground movement for better visualization
        this.groundOffset = (this.groundOffset + this.groundSpeed * deltaTime * 50) % 100;
        
        // Apply disturbance decay
        this.disturbanceForce *= this.disturbanceDecay;
        
        // Limit angle to prevent complete flip
        this.angle = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.angle));
        
        // Add to trail - use the base position for the trail
        const baseX = this.baseX + this.position * 10; // Scale position for better visualization
        this.trail.push({ x: baseX, y: this.baseY, time: currentTime });
        
        // Limit trail length
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Remove old trail points
        const trailTimeout = 2000; // 2 seconds
        this.trail = this.trail.filter(point => currentTime - point.time < trailTimeout);
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background grid (less prominent)
        this.drawGrid();
        
        // Draw trail
        this.drawTrail();
        
        // Calculate positions
        const segwayX = this.baseX + this.position * 10; // Scale position for better visualization
        const wheelY = this.baseY - 10;
        
        // Draw ground with movement
        this.drawGround(segwayX);
        
        // Save context for rotation
        this.ctx.save();
        
        // Translate to the wheel position and rotate
        this.ctx.translate(segwayX, wheelY);
        
        // Draw wheels
        this.drawWheels();
        
        // Draw platform (base)
        this.drawPlatform();
        
        // Draw Segway body
        this.drawSegwayBody();
        
        // Restore context
        this.ctx.restore();
        
        // Draw angle indicator
        this.drawAngleIndicator(segwayX, wheelY);
        
        // Draw target line (setpoint)
        this.drawTargetLine();
        
        // Add some text info
        this.ctx.fillStyle = '#000';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Angle: ${(this.angle * 180 / Math.PI).toFixed(1)}°`, 20, 30);
        this.ctx.fillText(`Speed: ${this.velocity.toFixed(2)} m/s`, 20, 50);
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        this.ctx.lineWidth = 0.5;
        
        // Vertical lines (less prominent)
        for (let x = 0; x < this.canvas.width; x += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Horizontal lines (only near the ground)
        for (let y = this.canvas.height - 150; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawTrail() {
        if (this.trail.length < 2) return;
        
        this.ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        for (let i = 0; i < this.trail.length; i++) {
            const point = this.trail[i];
            if (i === 0) {
                this.ctx.moveTo(point.x, point.y);
            } else {
                this.ctx.lineTo(point.x, point.y);
            }
        }
        
        this.ctx.stroke();
    }
    
    drawGround(segwayX) {
        const groundY = this.canvas.height - 20;
        
        // Ground fill
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, groundY, this.canvas.width, 20);
        
        // Ground texture with perspective
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        
        // Draw perspective lines
        for (let x = -this.groundOffset; x < this.canvas.width; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, groundY);
            this.ctx.lineTo(x + 20, groundY + 20);
            this.ctx.stroke();
        }
        
        // Draw center line
        this.ctx.strokeStyle = '#ffeb3b';
        this.ctx.setLineDash([20, 20]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, groundY - 5);
        this.ctx.lineTo(this.canvas.width, groundY - 5);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    // New method to draw Segway wheels
    drawWheels() {
        // Left wheel
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(-this.platformWidth/2, 0, this.wheelRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Wheel details
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(-this.platformWidth/2, 0, this.wheelRadius * 0.8, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Right wheel
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(this.platformWidth/2, 0, this.wheelRadius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Wheel details
        this.ctx.strokeStyle = '#555';
        this.ctx.beginPath();
        this.ctx.arc(this.platformWidth/2, 0, this.wheelRadius * 0.8, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    // New method to draw Segway platform
    drawPlatform() {
        // Platform base
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(-this.platformWidth/2, -this.platformHeight, this.platformWidth, this.platformHeight);
        
        // Platform highlights
        this.ctx.strokeStyle = '#888';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-this.platformWidth/2, -this.platformHeight, this.platformWidth, this.platformHeight);
    }
    
    // New method to draw Segway body
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
    
    // drawRobotBody method removed - replaced with drawSegwayBody
    
    // drawBase method removed - replaced with drawWheels and drawPlatform
    
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
}

drawTrail() {
    if (this.trail.length < 2) return;
    
    this.ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    for (let i = 0; i < this.trail.length; i++) {
        const point = this.trail[i];
        if (i === 0) {
            this.ctx.moveTo(point.x, point.y);
        } else {
            this.ctx.lineTo(point.x, point.y);
        }
    }
    
    this.ctx.stroke();
}

drawGround(segwayX) {
    const groundY = this.canvas.height - 20;
    
    // Ground fill
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fillRect(0, groundY, this.canvas.width, 20);
    
    // Ground texture with perspective
    this.ctx.strokeStyle = '#654321';
    this.ctx.lineWidth = 2;
    
    // Draw perspective lines
    for (let x = -this.groundOffset; x < this.canvas.width; x += 40) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, groundY);
        this.ctx.lineTo(x + 20, groundY + 20);
        this.ctx.stroke();
    }
    
    // Draw center line
    this.ctx.strokeStyle = '#ffeb3b';
    this.ctx.setLineDash([20, 20]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, groundY - 5);
    this.ctx.lineTo(this.canvas.width, groundY - 5);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
}

// New method to draw Segway wheels
drawWheels() {
    // Left wheel
    this.ctx.fillStyle = '#333';
    this.ctx.beginPath();
    this.ctx.arc(-this.platformWidth/2, 0, this.wheelRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Wheel details
    this.ctx.strokeStyle = '#555';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(-this.platformWidth/2, 0, this.wheelRadius * 0.8, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Right wheel
    this.ctx.fillStyle = '#333';
    this.ctx.beginPath();
    this.ctx.arc(this.platformWidth/2, 0, this.wheelRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Wheel details
    this.ctx.strokeStyle = '#555';
    this.ctx.beginPath();
    this.ctx.arc(this.platformWidth/2, 0, this.wheelRadius * 0.8, 0, Math.PI * 2);
    this.ctx.stroke();
}

// New method to draw Segway platform
drawPlatform() {
    // Platform base
    this.ctx.fillStyle = '#666';
    this.ctx.fillRect(-this.platformWidth/2, -this.platformHeight, this.platformWidth, this.platformHeight);
    
    // Platform highlights
    this.ctx.strokeStyle = '#888';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(-this.platformWidth/2, -this.platformHeight, this.platformWidth, this.platformHeight);
}

// New method to draw Segway body
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
