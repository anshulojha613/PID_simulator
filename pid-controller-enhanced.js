/**
 * PIDController - A PID controller implementation with anti-windup and filtering
 */
class PIDController {
    /**
     * Create a new PIDController instance
     * @param {number} kp - Proportional gain
     * @param {number} ki - Integral gain
     * @param {number} kd - Derivative gain
     */
    constructor(kp = 2.5, ki = 0.1, kd = 0.8) {
        // PID Coefficients with better defaults for Segway
        this.kp = kp; // Proportional gain - controls reaction to current error
        this.ki = ki; // Integral gain - eliminates steady-state error
        this.kd = kd; // Derivative gain - reduces overshoot and oscillations
        
        // Controller state
        this.setpoint = 0; // Target value (0 degrees for balancing)
        this.previousError = 0;
        this.integral = 0;
        this.lastTime = Date.now();
        this.lastOutput = 0;
        
        // Performance tracking
        this.errorHistory = [];
        this.outputHistory = [];
        this.maxHistoryLength = 1000;
        
        // Anti-windup and output limiting
        this.integralMax = 50;
        this.integralMin = -50;
        this.outputMax = 100;   // Maximum output torque
        this.outputMin = -100;  // Minimum output torque
        
        // Low-pass filter for derivative term (reduces noise)
        this.alpha = 0.15; // Smoothing factor (0-1), higher = more smoothing
        this.filteredDerivative = 0;
        
        // Rate limiting (slew rate)
        this.maxRate = 20; // Maximum change in output per second
        this.lastUpdateTime = Date.now();
    }
    
    // Set PID parameters
    setParameters(kp, ki, kd) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
    }
    
    // Reset controller state
    reset() {
        this.previousError = 0;
        this.integral = 0;
        this.filteredDerivative = 0;
        this.lastTime = Date.now();
        this.errorHistory = [];
        this.outputHistory = [];
        this.lastOutput = 0;
    }
    
    // Main update function - calculates control output
    calculate(setpoint, currentValue, deltaTime = null) {
        const currentTime = Date.now();
        
        // Calculate delta time if not provided
        if (deltaTime === null) {
            deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
        }
        
        // Prevent division by zero or negative time
        if (deltaTime <= 0) {
            deltaTime = 0.001; // 1ms default
        }
        
        this.setpoint = setpoint;
        
        // Calculate error
        const error = this.setpoint - currentValue;
        
        // 1. Proportional term: immediate response to current error
        const proportional = this.kp * error;
        
        // 2. Integral term: eliminate steady-state error
        this.integral += error * deltaTime;
        
        // Anti-windup: limit integral term
        this.integral = Math.max(this.integralMin, Math.min(this.integralMax, this.integral));
        const integral = this.ki * this.integral;
        
        // 3. Derivative term: predict future error based on rate of change
        let derivative = 0;
        if (deltaTime > 0) {
            const rawDerivative = (error - this.previousError) / deltaTime;
            // Apply low-pass filter to derivative term to reduce noise
            this.filteredDerivative = this.alpha * rawDerivative + (1 - this.alpha) * this.filteredDerivative;
            derivative = this.kd * this.filteredDerivative;
        }
        
        // Calculate total output
        let output = proportional + integral + derivative;
        
        // Rate limiting (slew rate)
        const maxChange = this.maxRate * deltaTime;
        output = Math.max(this.lastOutput - maxChange, 
                         Math.min(this.lastOutput + maxChange, output));
        
        // Apply output limits
        output = Math.max(this.outputMin, Math.min(this.outputMax, output));
        
        // Store values for next iteration
        this.previousError = error;
        this.lastTime = currentTime;
        this.lastOutput = output;
        
        // Store history for analysis
        this.storeHistory(error, output, {
            p: proportional,
            i: integral,
            d: derivative
        });
        
        return output;
    }
    
    // Alias for backward compatibility
    update(currentValue) {
        return this.calculate(this.setpoint, currentValue);
    }
    
    // Store historical data for analysis
    storeHistory(error, output, components = {}) {
        this.errorHistory.push(error);
        this.outputHistory.push({
            output: output,
            timestamp: Date.now(),
            components: components || {}
        });
        
        // Limit history size
        if (this.errorHistory.length > this.maxHistoryLength) {
            this.errorHistory.shift();
            this.outputHistory.shift();
        }
    }
    
    // Get current stability status
    getStabilityStatus() {
        if (this.errorHistory.length < 10) return 'Initializing';
        
        const recentErrors = this.errorHistory.slice(-10);
        const avgError = recentErrors.reduce((a, b) => a + Math.abs(b), 0) / recentErrors.length;
        
        if (avgError < 0.1) return 'Very Stable';
        if (avgError < 0.3) return 'Stable';
        if (avgError < 1.0) return 'Settling';
        if (avgError < 3.0) return 'Oscillating';
        return 'Unstable';
    }
    
    // Calculate RMS error over recent history
    getRMSError(windowSize = 50) {
        if (this.errorHistory.length < windowSize) return 0;
        
        const recent = this.errorHistory.slice(-windowSize);
        const sumSq = recent.reduce((sum, err) => sum + err * err, 0);
        return Math.sqrt(sumSq / recent.length);
    }
    
    // Get performance metrics
    getPerformanceMetrics() {
        return {
            stability: this.getStabilityStatus(),
            rmse: this.getRMSError(),
            currentError: this.errorHistory.length > 0 ? this.errorHistory[this.errorHistory.length - 1] : 0,
            avgError: this.errorHistory.length > 0 ? 
                this.errorHistory.reduce((a, b) => a + Math.abs(b), 0) / this.errorHistory.length : 0,
            output: this.lastOutput,
            integral: this.integral,
            derivative: this.filteredDerivative
        };
    }
    
    // Get recent error trend (slope of error over time)
    getErrorTrend(windowSize = 20) {
        if (this.errorHistory.length < windowSize) return 0;
        
        const recent = this.errorHistory.slice(-windowSize);
        const x = Array.from({length: recent.length}, (_, i) => i);
        const y = recent;
        
        // Simple linear regression to find trend
        const n = recent.length;
        const xSum = x.reduce((a, b) => a + b, 0);
        const ySum = y.reduce((a, b) => a + b, 0);
        const xySum = x.reduce((a, _, i) => a + x[i] * y[i], 0);
        const xSqSum = x.reduce((a, b) => a + b * b, 0);
        
        const slope = (n * xySum - xSum * ySum) / (n * xSqSum - xSum * xSum);
        return slope;
    }
    
    // Auto-tune the PID parameters (simplified implementation)
    autoTune(processVariable, setpoint, cycles = 5) {
        // This is a simplified auto-tune that adjusts based on oscillation analysis
        // For a real application, consider a more robust method like Ziegler-Nichols
        
        const kp = this.kp;
        const ki = this.ki;
        const kd = this.kd;
        
        // Store current state
        const currentIntegral = this.integral;
        const currentDerivative = this.filteredDerivative;
        const currentError = this.previousError;
        
        // Collect oscillation data
        const peaks = [];
        let lastOutput = 0;
        let lastCrossing = 0;
        let direction = 0;
        
        // Run simulation for specified cycles
        for (let i = 0; i < 1000; i++) {
            const output = this.calculate(setpoint, processVariable, 0.02); // 50Hz
            
            // Detect zero crossings for oscillation period
            if (lastOutput * output < 0) {
                const period = (i - lastCrossing) * 0.02; // Convert to seconds
                if (period > 0.1) { // Ignore high-frequency noise
                    peaks.push({
                        time: i * 0.02,
                        value: output,
                        period: period
                    });
                }
                lastCrossing = i;
            }
            
            lastOutput = output;
            
            // Stop if we've collected enough cycles
            if (peaks.length >= cycles * 2) break;
        }
        
        // Calculate new parameters if we have enough data
        if (peaks.length >= 4) {
            const periods = [];
            let sumAmplitude = 0;
            
            for (let i = 1; i < peaks.length; i++) {
                periods.push(peaks[i].time - peaks[i-1].time);
                sumAmplitude += Math.abs(peaks[i].value);
            }
            
            const avgPeriod = periods.reduce((a, b) => a + b, 0) / periods.length;
            const avgAmplitude = sumAmplitude / (peaks.length - 1);
            
            // Ziegler-Nichols tuning rules (simplified)
            const ku = 4 * kp / (Math.PI * avgAmplitude); // Ultimate gain
            const pu = avgPeriod; // Ultimate period
            
            // Update PID parameters
            this.kp = 0.6 * ku; // Less aggressive than Z-N to prevent instability
            this.ki = 1.2 * ku / pu;
            this.kd = 0.075 * ku * pu;
        }
        
        // Restore state
        this.integral = currentIntegral;
        this.filteredDerivative = currentDerivative;
        this.previousError = currentError;
        
        return {
            success: peaks.length >= 4,
            cycles: Math.floor(peaks.length / 2),
            period: peaks.length >= 2 ? (peaks[peaks.length-1].time - peaks[0].time) / (peaks.length - 1) : 0,
            amplitude: peaks.length > 0 ? 
                peaks.reduce((sum, peak) => sum + Math.abs(peak.value), 0) / peaks.length : 0,
            newParams: {
                kp: this.kp,
                ki: this.ki,
                kd: this.kd
            }
        };
    }
}

// Export the PIDController class to the global scope
if (typeof window !== 'undefined') {
    window.PIDController = PIDController;
    
    // Add utility methods to the global scope
    window.PIDController.createDefault = function() {
        return new PIDController(2.5, 0.1, 0.8);
    };
    
    // Method to update controller gains
    window.PIDController.prototype.setGains = function(kp, ki, kd) {
        this.kp = kp;
        this.ki = ki;
        this.kd = kd;
        console.log(`PID gains updated: Kp=${kp}, Ki=${ki}, Kd=${kd}`);
    };
    
    console.log('PIDController exported to window with utility methods');
}

// For Node.js/CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PIDController;
}
