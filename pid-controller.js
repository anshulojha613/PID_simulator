class PIDController {
    constructor(kp = 1.0, ki = 0.1, kd = 0.05) {
        this.kp = kp; // Proportional gain
        this.ki = ki; // Integral gain
        this.kd = kd; // Derivative gain
        
        this.setpoint = 0; // Target value (0 degrees for balancing)
        this.previousError = 0;
        this.integral = 0;
        this.lastTime = Date.now();
        
        // For tracking performance
        this.errorHistory = [];
        this.outputHistory = [];
        this.maxHistoryLength = 1000;
        
        // Integral windup protection
        this.integralMax = 100;
        this.integralMin = -100;
        
        // Output limits
        this.outputMax = 50;
        this.outputMin = -50;
    }
    
    setGains(kp, ki, kd) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
    }
    
    setSetpoint(setpoint) {
        this.setpoint = setpoint;
    }
    
    reset() {
        this.previousError = 0;
        this.integral = 0;
        this.lastTime = Date.now();
        this.errorHistory = [];
        this.outputHistory = [];
    }
    
    update(currentValue) {
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        
        if (deltaTime <= 0) {
            return 0;
        }
        
        // Calculate error
        const error = this.setpoint - currentValue;
        
        // Proportional term
        const proportional = this.kp * error;
        
        // Integral term (with windup protection)
        this.integral += error * deltaTime;
        this.integral = Math.max(this.integralMin, Math.min(this.integralMax, this.integral));
        const integral = this.ki * this.integral;
        
        // Derivative term
        const derivative = this.kd * (error - this.previousError) / deltaTime;
        
        // Calculate total output
        let output = proportional + integral + derivative;
        
        // Apply output limits
        output = Math.max(this.outputMin, Math.min(this.outputMax, output));
        
        // Store for next iteration
        this.previousError = error;
        this.lastTime = currentTime;
        
        // Store history for graphing
        this.errorHistory.push(error);
        this.outputHistory.push(output);
        
        // Limit history length
        if (this.errorHistory.length > this.maxHistoryLength) {
            this.errorHistory.shift();
            this.outputHistory.shift();
        }
        
        return {
            output: output,
            error: error,
            proportional: proportional,
            integral: integral,
            derivative: derivative,
            components: {
                p: proportional,
                i: integral,
                d: derivative
            }
        };
    }
    
    getStabilityStatus(error) {
        const absError = Math.abs(error);
        
        if (absError < 0.5) {
            return 'Stable';
        } else if (absError < 2.0) {
            return 'Settling';
        } else if (absError < 5.0) {
            return 'Oscillating';
        } else {
            return 'Unstable';
        }
    }
    
    // Get recent error trend for analysis
    getErrorTrend(samples = 10) {
        if (this.errorHistory.length < samples) {
            return 0;
        }
        
        const recent = this.errorHistory.slice(-samples);
        const older = this.errorHistory.slice(-samples * 2, -samples);
        
        if (older.length === 0) return 0;
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        return recentAvg - olderAvg;
    }
    
    // Calculate settling time (time to reach within 2% of setpoint)
    getSettlingTime() {
        const threshold = 0.02 * Math.abs(this.setpoint);
        let settlingIndex = -1;
        
        for (let i = this.errorHistory.length - 1; i >= 0; i--) {
            if (Math.abs(this.errorHistory[i]) > threshold) {
                settlingIndex = i;
                break;
            }
        }
        
        if (settlingIndex === -1) {
            return 0; // Already settled
        }
        
        return (this.errorHistory.length - settlingIndex) * 0.016; // Assuming ~60fps
    }
    
    // Calculate overshoot percentage
    getOvershoot() {
        if (this.errorHistory.length < 10) return 0;
        
        const maxError = Math.max(...this.errorHistory.map(Math.abs));
        const setpointRange = Math.abs(this.setpoint) || 1;
        
        return (maxError / setpointRange) * 100;
    }
    
    // Get performance metrics
    getPerformanceMetrics() {
        return {
            settlingTime: this.getSettlingTime(),
            overshoot: this.getOvershoot(),
            steadyStateError: this.errorHistory.length > 0 ? 
                Math.abs(this.errorHistory[this.errorHistory.length - 1]) : 0,
            errorTrend: this.getErrorTrend()
        };
    }
}
