class PIDSimulatorApp {
    constructor() {
        console.log('Initializing PIDSimulatorApp...');
        
        // Get canvas elements
        this.simulationCanvas = document.getElementById('simulationCanvas');
        this.graphCanvas = document.getElementById('graphCanvas');
        
        if (!this.simulationCanvas || !this.graphCanvas) {
            console.error('Required canvas elements not found');
            return;
        }
        
        try {
            // Initialize components with proper error handling
            console.log('Creating PIDController...');
            this.pidController = new window.PIDController(2.0, 0.1, 0.5);
            
            console.log('Creating BalancingRobot...');
            this.robot = new window.BalancingRobot(this.simulationCanvas, this.pidController);
            
            console.log('Creating PerformanceGraph...');
            this.graph = new PerformanceGraph(this.graphCanvas);
            
            console.log('All components initialized successfully');
        } catch (error) {
            console.error('Error initializing components:', error);
            alert('Failed to initialize simulation: ' + error.message);
            return;
        }
        
        // Simulation state
        this.isRunning = false;
        this.animationId = null;
        this.lastUpdateTime = Date.now();
        
        // UI elements
        this.initializeUI();
        
        // Presets
        this.presets = {
            stable: { kp: 2.0, ki: 0.1, kd: 0.3 },
            oscillating: { kp: 5.0, ki: 0.01, kd: 0.05 },
            overdamped: { kp: 0.5, ki: 0.05, kd: 0.8 },
            underdamped: { kp: 3.0, ki: 0.2, kd: 0.1 }
        };
        
        // Start with initial render
        this.updateDisplay();
        this.robot.render();
        this.graph.render();
    }
    
    initializeUI() {
        // PID parameter sliders
        this.kpSlider = document.getElementById('kpSlider');
        this.kiSlider = document.getElementById('kiSlider');
        this.kdSlider = document.getElementById('kdSlider');
        
        this.kpValue = document.getElementById('kpValue');
        this.kiValue = document.getElementById('kiValue');
        this.kdValue = document.getElementById('kdValue');
        
        // Status displays
        this.angleDisplay = document.getElementById('angleDisplay');
        this.errorDisplay = document.getElementById('errorDisplay');
        this.outputDisplay = document.getElementById('outputDisplay');
        this.stabilityDisplay = document.getElementById('stabilityDisplay');
        
        // Control buttons
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.disturbBtn = document.getElementById('disturbBtn');
        
        // Graph controls
        this.clearGraphBtn = document.getElementById('clearGraphBtn');
        this.showSetpoint = document.getElementById('showSetpoint');
        this.showError = document.getElementById('showError');
        this.showOutput = document.getElementById('showOutput');
        
        // Preset buttons
        this.presetButtons = document.querySelectorAll('.preset-btn');
        
        // Add event listeners
        this.addEventListeners();
        
        // Initialize slider values
        this.updateSliderValues();
    }
    
    addEventListeners() {
        // PID parameter sliders
        this.kpSlider.addEventListener('input', () => this.updatePIDParameters());
        this.kiSlider.addEventListener('input', () => this.updatePIDParameters());
        this.kdSlider.addEventListener('input', () => this.updatePIDParameters());
        
        // Control buttons
        this.startBtn.addEventListener('click', () => this.startSimulation());
        this.pauseBtn.addEventListener('click', () => this.pauseSimulation());
        this.resetBtn.addEventListener('click', () => this.resetSimulation());
        this.disturbBtn.addEventListener('click', () => this.addDisturbance());
        
        // Graph controls
        this.clearGraphBtn.addEventListener('click', () => this.clearGraph());
        this.showSetpoint.addEventListener('change', () => this.updateGraphDisplay());
        this.showError.addEventListener('change', () => this.updateGraphDisplay());
        this.showOutput.addEventListener('change', () => this.updateGraphDisplay());
        
        // Preset buttons
        this.presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.loadPreset(preset);
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Canvas resize handling
        window.addEventListener('resize', () => this.handleResize());
    }
    
    updatePIDParameters() {
        const kp = parseFloat(this.kpSlider.value);
        const ki = parseFloat(this.kiSlider.value);
        const kd = parseFloat(this.kdSlider.value);
        
        this.pidController.setGains(kp, ki, kd);
        this.updateSliderValues();
    }
    
    updateSliderValues() {
        this.kpValue.textContent = parseFloat(this.kpSlider.value).toFixed(2);
        this.kiValue.textContent = parseFloat(this.kiSlider.value).toFixed(3);
        this.kdValue.textContent = parseFloat(this.kdSlider.value).toFixed(3);
    }
    
    startSimulation() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastUpdateTime = Date.now();
            this.startBtn.textContent = 'Running...';
            this.startBtn.disabled = true;
            this.animate();
        }
    }
    
    pauseSimulation() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.startBtn.textContent = 'Start';
        this.startBtn.disabled = false;
    }
    
    resetSimulation() {
        this.pauseSimulation();
        this.robot.reset();
        this.pidController.reset();
        this.graph.clear();
        this.updateDisplay();
        this.robot.render();
        this.graph.render();
    }
    
    addDisturbance() {
        const force = 3 + Math.random() * 4; // Random force between 3-7
        this.robot.applyDisturbance(force);
        
        // Visual feedback
        this.disturbBtn.style.background = 'linear-gradient(145deg, #ff6b6b, #ee5a24)';
        setTimeout(() => {
            this.disturbBtn.style.background = '';
        }, 200);
    }
    
    clearGraph() {
        this.graph.clear();
        this.graph.render();
    }
    
    updateGraphDisplay() {
        this.graph.setDisplayOptions(
            this.showSetpoint.checked,
            this.showError.checked,
            this.showOutput.checked
        );
        this.graph.render();
    }
    
    loadPreset(presetName) {
        const preset = this.presets[presetName];
        if (preset) {
            this.kpSlider.value = preset.kp;
            this.kiSlider.value = preset.ki;
            this.kdSlider.value = preset.kd;
            this.updatePIDParameters();
            
            // Visual feedback
            const button = document.querySelector(`[data-preset="${presetName}"]`);
            button.style.background = 'linear-gradient(145deg, #4CAF50, #45a049)';
            setTimeout(() => {
                button.style.background = '';
            }, 300);
        }
    }
    
    handleKeyboard(e) {
        switch(e.key) {
            case ' ':
                e.preventDefault();
                if (this.isRunning) {
                    this.pauseSimulation();
                } else {
                    this.startSimulation();
                }
                break;
            case 'r':
            case 'R':
                this.resetSimulation();
                break;
            case 'd':
            case 'D':
                this.addDisturbance();
                break;
            case 'c':
            case 'C':
                this.clearGraph();
                break;
        }
    }
    
    handleResize() {
        // Simple resize handling - could be enhanced
        setTimeout(() => {
            this.robot.render();
            this.graph.render();
        }, 100);
    }
    
    animate() {
        if (!this.isRunning) return;
        
        const currentTime = Date.now();
        const deltaTime = Math.min((currentTime - this.lastUpdateTime) / 1000, 0.02);
        this.lastUpdateTime = currentTime;
        
        // Update robot physics
        this.robot.update();
        
        // Get current robot state
        const robotState = this.robot.getState();
        
        // Update PID controller
        const pidResult = this.pidController.update(robotState.angleDegrees);
        
        // Apply PID output to robot
        this.robot.setTorque(pidResult.output);
        
        // Update displays
        this.updateDisplay(robotState, pidResult);
        
        // Add data to graph
        this.graph.addDataPoint(
            robotState.angleDegrees,
            pidResult.error,
            pidResult.output,
            0 // setpoint is always 0 degrees
        );
        
        // Render everything
        this.robot.render();
        this.graph.render();
        
        // Continue animation
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    updateDisplay(robotState = null, pidResult = null) {
        if (robotState) {
            this.angleDisplay.textContent = robotState.angleDegrees.toFixed(1) + '°';
            
            // Color code angle based on stability
            const absAngle = Math.abs(robotState.angleDegrees);
            if (absAngle < 1) {
                this.angleDisplay.style.color = '#4CAF50';
            } else if (absAngle < 5) {
                this.angleDisplay.style.color = '#ff9800';
            } else {
                this.angleDisplay.style.color = '#f44336';
            }
        }
        
        if (pidResult) {
            this.errorDisplay.textContent = pidResult.error.toFixed(2);
            this.outputDisplay.textContent = pidResult.output.toFixed(2);
            
            // Update stability status
            const stability = this.pidController.getStabilityStatus(pidResult.error);
            this.stabilityDisplay.textContent = stability;
            
            // Color code stability
            switch(stability) {
                case 'Stable':
                    this.stabilityDisplay.style.color = '#4CAF50';
                    break;
                case 'Settling':
                    this.stabilityDisplay.style.color = '#2196F3';
                    break;
                case 'Oscillating':
                    this.stabilityDisplay.style.color = '#ff9800';
                    break;
                case 'Unstable':
                    this.stabilityDisplay.style.color = '#f44336';
                    break;
            }
        }
    }
    
    // Public methods for external control
    setKp(value) {
        this.kpSlider.value = value;
        this.updatePIDParameters();
    }
    
    setKi(value) {
        this.kiSlider.value = value;
        this.updatePIDParameters();
    }
    
    setKd(value) {
        this.kdSlider.value = value;
        this.updatePIDParameters();
    }
    
    getPerformanceMetrics() {
        return {
            pid: this.pidController.getPerformanceMetrics(),
            graph: this.graph.getStatistics()
        };
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.pidSimulator = new PIDSimulatorApp();
    
    // Add some helpful console messages
    console.log('PID Simulator loaded successfully!');
    console.log('Keyboard shortcuts:');
    console.log('  Space: Start/Pause simulation');
    console.log('  R: Reset simulation');
    console.log('  D: Add disturbance');
    console.log('  C: Clear graph');
    console.log('');
    console.log('Try different PID values to see how they affect the robot balance!');
    console.log('Access the simulator programmatically via window.pidSimulator');
});
