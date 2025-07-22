# PID Controller Simulator

[![Work in Progress](https://img.shields.io/badge/status-work%20in%20progress-orange)](https://github.com/yourusername/pid-simulator)

> **Note:** This is a work in progress. The simulation is currently under development and may have some issues.

An interactive web-based PID controller simulator that demonstrates how Proportional-Integral-Derivative control works through a visual balancing robot simulation.

## Features

- **Real-time Simulation**: Watch a balancing robot respond to PID control inputs
- **Interactive Controls**: Adjust P, I, and D parameters with sliders
- **Visual Feedback**: See the robot's angle, error, and control output in real-time
- **Performance Graphing**: Track system performance over time
- **Preset Configurations**: Try different PID tuning scenarios
- **Disturbance Testing**: Add random disturbances to test controller robustness
- **Educational**: Learn how each PID component affects system behavior

## Current Status

⚠️ **Work in Progress** - The simulation is currently being debugged and improved. Some features may not work as expected.

### Known Issues
- Simulation may not start properly in some browsers
- PID control response may need tuning
- Performance optimizations are needed

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pid-simulator.git
   cd pid-simulator
   ```

2. Start a local development server:
   ```bash
   python3 -m http.server 8000
   ```

3. Open `http://localhost:8000` in your web browser

## How to Use (Planned)

1. **Open `index.html`** in a web browser or serve it from a local web server
2. **Adjust PID Parameters** using the sliders:
   - **Kp (Proportional)**: Controls immediate response to current error
   - **Ki (Integral)**: Eliminates steady-state error over time
   - **Kd (Derivative)**: Predicts future error and dampens oscillations
3. **Start the Simulation** by clicking the "Start" button
4. **Experiment** with different values and observe the robot's behavior
5. **Add Disturbances** to test how well your PID settings handle disruptions

## Keyboard Shortcuts

- **Space**: Start/Pause simulation
- **R**: Reset simulation
- **D**: Add disturbance
- **C**: Clear performance graph

## Contributing

Contributions are welcome! If you'd like to help improve this project, please:

1. Fork the repository
2. Create a new branch for your feature or bugfix
3. Commit your changes
4. Push to the branch
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## PID Control Basics

### What is PID Control?
PID control is a widely-used feedback control mechanism that continuously calculates an error value and applies corrections based on proportional, integral, and derivative terms.

### The Components:

- **Proportional (P)**: Responds proportionally to the current error
  - Higher values = stronger immediate response
  - Too high = oscillations and overshoot
  - Too low = slow response

- **Integral (I)**: Accumulates error over time to eliminate steady-state offset
  - Higher values = faster elimination of steady-state error
  - Too high = oscillations and instability
  - Too low = persistent steady-state error

- **Derivative (D)**: Predicts future error based on rate of change
  - Higher values = better damping of oscillations
  - Too high = noise amplification and instability
  - Too low = more overshoot and oscillations

### Tuning Tips:

1. **Start with P only**: Set I=0, D=0, and increase P until you get oscillations
2. **Add D**: Increase D to dampen oscillations while maintaining responsiveness
3. **Add I**: Increase I slowly to eliminate steady-state error
4. **Fine-tune**: Adjust all three parameters for optimal performance

## Preset Configurations

- **Stable**: Well-tuned parameters for stable operation
- **Oscillating**: High P value causing oscillations
- **Overdamped**: High D value causing slow, sluggish response
- **Underdamped**: Parameters causing overshoot and ringing

## Technical Details

### Simulation Model
The robot is modeled as an inverted pendulum with the following physics:
- Mass: 1.0 kg
- Length: 0.5 m
- Gravity: 9.81 m/s²
- Friction: 0.1 (damping coefficient)

### Control Loop
- Update rate: ~60 FPS
- PID calculation includes integral windup protection
- Output limiting prevents excessive control signals

## Files Structure

- `index.html` - Main HTML interface
- `styles.css` - Styling and responsive design
- `pid-controller.js` - PID control algorithm implementation
- `robot-simulation.js` - Physics simulation and rendering
- `graph.js` - Performance graphing and visualization
- `main.js` - Main application logic and UI handling

## Browser Compatibility

Works in all modern browsers that support HTML5 Canvas and ES6 JavaScript features.

## Educational Use

This simulator is perfect for:
- Control systems education
- Understanding PID tuning
- Demonstrating control theory concepts
- Engineering coursework and demonstrations

## License

Open source - feel free to use and modify for educational purposes.

---

**Pro Tip**: Try the "Stable" preset first, then experiment with individual parameters to see how they affect the robot's behavior!
