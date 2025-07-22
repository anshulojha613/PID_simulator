// PerformanceGraph class for visualizing PID controller performance
class PerformanceGraph {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Graph properties
        this.padding = 50;
        this.graphWidth = canvas.width - 2 * this.padding;
        this.graphHeight = canvas.height - 2 * this.padding;
        
        // Data storage
        this.timeData = [];
        this.angleData = [];
        this.errorData = [];
        this.outputData = [];
        this.setpointData = [];
        
        this.maxDataPoints = 500;
        this.timeWindow = 10; // seconds
        
        // Display options
        this.showSetpoint = true;
        this.showError = true;
        this.showOutput = true;
        
        // Colors
        this.colors = {
            setpoint: '#ff0000',
            angle: '#4CAF50',
            error: '#ff9800',
            output: '#2196F3',
            grid: '#e0e0e0',
            axis: '#666',
            text: '#333'
        };
        
        this.startTime = Date.now();
    }
    
    addDataPoint(angle, error, output, setpoint = 0) {
        const currentTime = (Date.now() - this.startTime) / 1000; // Convert to seconds
        
        this.timeData.push(currentTime);
        this.angleData.push(angle);
        this.errorData.push(error);
        this.outputData.push(output);
        this.setpointData.push(setpoint);
        
        // Limit data points
        if (this.timeData.length > this.maxDataPoints) {
            this.timeData.shift();
            this.angleData.shift();
            this.errorData.shift();
            this.outputData.shift();
            this.setpointData.shift();
        }
    }
    
    clear() {
        this.timeData = [];
        this.angleData = [];
        this.errorData = [];
        this.outputData = [];
        this.setpointData = [];
        this.startTime = Date.now();
    }
    
    setDisplayOptions(showSetpoint, showError, showOutput) {
        this.showSetpoint = showSetpoint;
        this.showError = showError;
        this.showOutput = showOutput;
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.timeData.length === 0) {
            this.drawEmptyGraph();
            return;
        }
        
        // Calculate data ranges
        const timeRange = this.calculateTimeRange();
        const valueRange = this.calculateValueRange();
        
        // Draw grid and axes
        this.drawGrid(timeRange, valueRange);
        this.drawAxes(timeRange, valueRange);
        
        // Draw data lines
        if (this.showSetpoint) {
            this.drawLine(this.timeData, this.setpointData, timeRange, valueRange, this.colors.setpoint, 'Setpoint');
        }
        
        this.drawLine(this.timeData, this.angleData, timeRange, valueRange, this.colors.angle, 'Angle');
        
        if (this.showError) {
            this.drawLine(this.timeData, this.errorData, timeRange, valueRange, this.colors.error, 'Error');
        }
        
        if (this.showOutput) {
            this.drawLine(this.timeData, this.outputData, timeRange, valueRange, this.colors.output, 'Output');
        }
        
        // Draw legend
        this.drawLegend();
    }
    
    calculateTimeRange() {
        if (this.timeData.length === 0) return { min: 0, max: this.timeWindow };
        
        const maxTime = Math.max(...this.timeData);
        const minTime = Math.max(0, maxTime - this.timeWindow);
        
        return { min: minTime, max: maxTime };
    }
    
    calculateValueRange() {
        if (this.timeData.length === 0) return { min: -10, max: 10 };
        
        let allValues = [...this.angleData];
        
        if (this.showError) {
            allValues = allValues.concat(this.errorData);
        }
        
        if (this.showOutput) {
            allValues = allValues.concat(this.outputData);
        }
        
        if (this.showSetpoint) {
            allValues = allValues.concat(this.setpointData);
        }
        
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        
        // Add some padding
        const range = max - min;
        const padding = range * 0.1;
        
        return {
            min: min - padding,
            max: max + padding
        };
    }
    
    drawEmptyGraph() {
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Start simulation to see performance data', 
                         this.canvas.width / 2, this.canvas.height / 2);
    }
    
    drawGrid(timeRange, valueRange) {
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        
        // Vertical grid lines (time)
        const timeStep = (timeRange.max - timeRange.min) / 10;
        for (let i = 0; i <= 10; i++) {
            const time = timeRange.min + i * timeStep;
            const x = this.padding + (time - timeRange.min) / (timeRange.max - timeRange.min) * this.graphWidth;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.padding);
            this.ctx.lineTo(x, this.padding + this.graphHeight);
            this.ctx.stroke();
        }
        
        // Horizontal grid lines (values)
        const valueStep = (valueRange.max - valueRange.min) / 8;
        for (let i = 0; i <= 8; i++) {
            const value = valueRange.min + i * valueStep;
            const y = this.padding + this.graphHeight - (value - valueRange.min) / (valueRange.max - valueRange.min) * this.graphHeight;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.padding, y);
            this.ctx.lineTo(this.padding + this.graphWidth, y);
            this.ctx.stroke();
        }
    }
    
    drawAxes(timeRange, valueRange) {
        this.ctx.strokeStyle = this.colors.axis;
        this.ctx.lineWidth = 2;
        
        // X-axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding, this.padding + this.graphHeight);
        this.ctx.lineTo(this.padding + this.graphWidth, this.padding + this.graphHeight);
        this.ctx.stroke();
        
        // Y-axis
        this.ctx.beginPath();
        this.ctx.moveTo(this.padding, this.padding);
        this.ctx.lineTo(this.padding, this.padding + this.graphHeight);
        this.ctx.stroke();
        
        // Labels
        this.ctx.fillStyle = this.colors.text;
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        
        // X-axis labels (time)
        const timeStep = (timeRange.max - timeRange.min) / 5;
        for (let i = 0; i <= 5; i++) {
            const time = timeRange.min + i * timeStep;
            const x = this.padding + (time - timeRange.min) / (timeRange.max - timeRange.min) * this.graphWidth;
            this.ctx.fillText(time.toFixed(1) + 's', x, this.padding + this.graphHeight + 20);
        }
        
        // Y-axis labels (values)
        this.ctx.textAlign = 'right';
        const valueStep = (valueRange.max - valueRange.min) / 4;
        for (let i = 0; i <= 4; i++) {
            const value = valueRange.min + i * valueStep;
            const y = this.padding + this.graphHeight - (value - valueRange.min) / (valueRange.max - valueRange.min) * this.graphHeight;
            this.ctx.fillText(value.toFixed(1), this.padding - 10, y + 4);
        }
        
        // Axis titles
        this.ctx.textAlign = 'center';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Time (seconds)', this.canvas.width / 2, this.canvas.height - 10);
        
        this.ctx.save();
        this.ctx.translate(15, this.canvas.height / 2);
        this.ctx.rotate(-Math.PI / 2);
        this.ctx.fillText('Value', 0, 0);
        this.ctx.restore();
    }
    
    drawLine(timeData, valueData, timeRange, valueRange, color, label) {
        if (timeData.length < 2) return;
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        let firstPoint = true;
        
        for (let i = 0; i < timeData.length; i++) {
            const time = timeData[i];
            const value = valueData[i];
            
            // Only draw points within the time window
            if (time < timeRange.min) continue;
            
            const x = this.padding + (time - timeRange.min) / (timeRange.max - timeRange.min) * this.graphWidth;
            const y = this.padding + this.graphHeight - (value - valueRange.min) / (valueRange.max - valueRange.min) * this.graphHeight;
            
            if (firstPoint) {
                this.ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }
    
    drawLegend() {
        const legendX = this.canvas.width - 150;
        const legendY = this.padding + 20;
        const lineHeight = 20;
        let currentY = legendY;
        
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        
        const legendItems = [
            { color: this.colors.angle, label: 'Angle (°)', show: true },
            { color: this.colors.setpoint, label: 'Setpoint', show: this.showSetpoint },
            { color: this.colors.error, label: 'Error', show: this.showError },
            { color: this.colors.output, label: 'Output', show: this.showOutput }
        ];
        
        legendItems.forEach(item => {
            if (!item.show) return;
            
            // Draw line
            this.ctx.strokeStyle = item.color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(legendX, currentY);
            this.ctx.lineTo(legendX + 20, currentY);
            this.ctx.stroke();
            
            // Draw label
            this.ctx.fillStyle = this.colors.text;
            this.ctx.fillText(item.label, legendX + 25, currentY + 4);
            
            currentY += lineHeight;
        });
    }
    
    // Get statistics for the current data
    getStatistics() {
        if (this.timeData.length === 0) {
            return {
                duration: 0,
                avgError: 0,
                maxError: 0,
                settlingTime: 0,
                overshoot: 0
            };
        }
        
        const duration = Math.max(...this.timeData) - Math.min(...this.timeData);
        const avgError = this.errorData.reduce((a, b) => a + Math.abs(b), 0) / this.errorData.length;
        const maxError = Math.max(...this.errorData.map(Math.abs));
        
        // Calculate settling time (time to reach within 2% of setpoint)
        let settlingTime = duration;
        const threshold = 2; // degrees
        for (let i = this.angleData.length - 1; i >= 0; i--) {
            if (Math.abs(this.angleData[i]) > threshold) {
                settlingTime = this.timeData[i];
                break;
            }
        }
        
        // Calculate overshoot
        const maxAngle = Math.max(...this.angleData.map(Math.abs));
        const overshoot = maxAngle;
        
        return {
            duration: duration,
            avgError: avgError,
            maxError: maxError,
            settlingTime: settlingTime,
            overshoot: overshoot
        };
    }
}

// Export the PerformanceGraph class and utility functions to the global scope
if (typeof window !== 'undefined') {
    window.PerformanceGraph = PerformanceGraph;
    
    // Create a default graph instance if the canvas exists
    document.addEventListener('DOMContentLoaded', () => {
        const canvas = document.getElementById('graphCanvas');
        if (canvas) {
            const graph = new PerformanceGraph(canvas);
            
            // Expose utility functions to the global scope
            window.updateGraph = (angle, output, error) => {
                graph.addDataPoint(angle, error, output);
                graph.render();
            };
            
            window.resetGraph = () => {
                graph.reset();
                graph.render();
            };
            
            window.updateGraphSize = () => {
                graph.handleResize();
            };
            
            // Initial render
            graph.render();
        }
    });
    
    console.log('PerformanceGraph exported to window');
}
