# Sleep Cycle Optimizer

A frontend-only web application that calculates optimal wake-up times based on sleep cycle science and circadian rhythms.

## Features

### Core Functionality
- **Sleep Cycle Calculation**: Based on 90-minute sleep cycles with precise stage breakdowns
- **Smart Wake Windows**: Identifies best, okay, and worst times to wake up
- **Fajr Integration**: Analyzes where Fajr prayer time falls in your sleep cycle
- **Customizable Cycle Length**: Adjust from 80-110 minutes to match your personal sleep patterns

### Advanced Features
- **Work Mode**: Set a deadline and get the best wake time before it
- **Visual Timeline**: Interactive visualization of sleep cycles and stages
- **Export Options**: Save as PDF, copy as text, or share via URL
- **URL Sharing**: Share your sleep schedule with others via custom URLs

## How It Works

### Sleep Science
The app uses established sleep research:
- Each sleep cycle ≈ 90 minutes
- **Stage 1-2** (0-20 min): Early light sleep → ✅ Best time to wake (natural wake window)
- **Transition** (20-25 min): Light to deep sleep → ⚠️ Okay to wake 
- **Stage 3** (25-60 min): Deep sleep → ❌ Worst time to wake (grogginess)
- **Late Light** (60-70 min): Pre-REM light sleep → ⚠️ Okay to wake
- **REM Prep** (70-80 min): REM preparation → ⚠️ Okay to wake
- **Stage 4/REM** (80-90 min): REM completion → ✅ Best time to wake (refreshed)

### Wake Windows
For each cycle, the app identifies:
- ✅ **Best windows**: Beginning of cycle (0-20 min early light) and end of cycle (80-90 min REM) - natural wake points
- ⚠️ **Okay windows**: Late light sleep and transition phases - acceptable but not optimal
- ❌ **Worst windows**: Deep sleep phase (25-60 min) - high grogginess risk

## Usage

1. **Set your bedtime** using the time picker
2. **Optional**: Add Fajr time for prayer-specific recommendations
3. **Adjust cycle length** if you know your personal sleep patterns differ from 90 minutes
4. **Enable Work Mode** if you have a specific wake-up deadline
5. Click **Calculate** to see your optimal wake-up schedule

### Example Output
For bedtime at 11:30 PM:
- ✅ **Best**: 11:30-11:50 PM (early light), 1:20-1:30 AM (REM end), 2:50-3:00 AM (early light), 4:20-4:30 AM (REM end), 5:50-6:00 AM (early light)
- ⚠️ **Okay**: 12:30-12:40 AM (late light), 1:10-1:20 AM (REM prep), 2:40-2:50 AM (late light)
- ❌ **Avoid**: 11:55 PM-12:25 AM, 1:55-2:25 AM, 3:25-3:55 AM

## Technical Details

- **Frontend-only**: No backend required, runs entirely in browser
- **Technology**: HTML5, CSS3, JavaScript (ES6+), Tailwind CSS
- **Browser Support**: Modern browsers with ES6 support
- **Responsive**: Works on desktop, tablet, and mobile devices

## File Structure

```
├── index.html          # Main application page
├── script.js           # Core sleep calculation logic
└── README.md           # This documentation
```

## Getting Started

1. Open `index.html` in any modern web browser
2. No installation or setup required
3. Works offline once loaded

## Features in Detail

### Fajr Analysis
When Fajr time is provided:
- Shows which sleep stage Fajr falls into
- Provides recommendations for prayer and post-prayer sleep
- Suggests optimal times to wake up if returning to sleep

### Work Mode
- Set a mandatory wake-up deadline
- App finds the best sleep cycle exit before your deadline
- Helps balance sleep quality with work requirements

### Export Options
- **PDF Export**: Print-friendly schedule for offline reference
- **Text Copy**: Plain text format for easy sharing
- **URL Sharing**: Custom URLs preserve all your settings

### Visualization
- Color-coded timeline showing each sleep cycle
- Visual representation of sleep stages
- Fajr marker placement within cycles

## Sleep Tips

- Most people need 7-9 hours of sleep (5-6 complete cycles)
- Consistency in bedtime and wake time improves sleep quality
- Avoid screens 1 hour before bedtime
- Keep your bedroom cool, dark, and quiet
- Consider your personal chronotype when setting schedules

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

This project is open source and available under the MIT License.
