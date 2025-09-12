
class SleepCycleCalculator {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const calculateBtn = document.getElementById('calculateBtn');
        const cycleLength = document.getElementById('cycleLength');
        const cycleValue = document.getElementById('cycleValue');
        const workMode = document.getElementById('workMode');
        const mustWakeBy = document.getElementById('mustWakeBy');

        calculateBtn.addEventListener('click', () => this.calculateSleepCycles());
        
        cycleLength.addEventListener('input', (e) => {
            cycleValue.textContent = e.target.value;
        });

        // Fajr mode toggle
        document.querySelectorAll('input[name="fajrMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleFajrSections(e.target.value);
                this.calculateSleepCycles();
            });
        });

        // Work mode toggle
        workMode.addEventListener('change', (e) => {
            mustWakeBy.disabled = !e.target.checked;
            if (!e.target.checked) {
                mustWakeBy.value = '';
            }
        });

        // Export buttons
        document.getElementById('exportPDF').addEventListener('click', () => this.exportToPDF());
        document.getElementById('exportText').addEventListener('click', () => this.exportToText());
        document.getElementById('shareURL').addEventListener('click', () => this.shareURL());

        // Auto-calculate when inputs change
        document.getElementById('bedtime').addEventListener('change', () => this.calculateSleepCycles());
        document.getElementById('fajr').addEventListener('change', () => this.calculateSleepCycles());
        document.getElementById('fajrStart').addEventListener('change', () => this.calculateSleepCycles());
        document.getElementById('fajrEnd').addEventListener('change', () => this.calculateSleepCycles());
        document.getElementById('workTime').addEventListener('change', () => this.calculateSleepCycles());
        mustWakeBy.addEventListener('change', () => this.calculateSleepCycles());
    }

    toggleFajrSections(mode) {
        const fixedSection = document.getElementById('fixedFajrSection');
        const windowSection = document.getElementById('fajrWindowSection');
        
        fixedSection.classList.add('hidden');
        windowSection.classList.add('hidden');
        
        if (mode === 'fixed') {
            fixedSection.classList.remove('hidden');
        } else if (mode === 'window') {
            windowSection.classList.remove('hidden');
        }
    }

    parseTimeString(timeString) {
        if (!timeString) return null;
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    addMinutes(date, minutes) {
        return new Date(date.getTime() + minutes * 60000);
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }

    calculateSleepCycles() {
        const bedtimeInput = document.getElementById('bedtime').value;
        const cycleLength = parseInt(document.getElementById('cycleLength').value);
        const workMode = document.getElementById('workMode').checked;
        const mustWakeByInput = document.getElementById('mustWakeBy').value;
        
        // Get Fajr mode and related inputs
        const fajrMode = document.querySelector('input[name="fajrMode"]:checked').value;
        const fajrInput = document.getElementById('fajr').value;
        const fajrStartInput = document.getElementById('fajrStart').value;
        const fajrEndInput = document.getElementById('fajrEnd').value;
        const workTimeInput = document.getElementById('workTime').value;

        if (!bedtimeInput) {
            alert('Please enter a bedtime');
            return;
        }

        const bedtime = this.parseTimeString(bedtimeInput);
        
        // Handle different Fajr modes
        let fajr = null;
        let fajrWindow = null;
        let workTime = null;
        
        if (fajrMode === 'fixed' && fajrInput) {
            fajr = this.parseTimeString(fajrInput);
        } else if (fajrMode === 'window' && fajrStartInput && fajrEndInput) {
            fajrWindow = {
                start: this.parseTimeString(fajrStartInput),
                end: this.parseTimeString(fajrEndInput)
            };
            if (workTimeInput) {
                workTime = this.parseTimeString(workTimeInput);
            }
        }
        
        const mustWakeBy = workMode && mustWakeByInput ? this.parseTimeString(mustWakeByInput) : null;

        // Adjust dates for next day if needed
        if (bedtime.getHours() < 12) {
            bedtime.setDate(bedtime.getDate() + 1);
        }

        if (fajr && fajr <= bedtime) {
            fajr.setDate(fajr.getDate() + 1);
        }

        if (fajrWindow) {
            if (fajrWindow.start <= bedtime) {
                fajrWindow.start.setDate(fajrWindow.start.getDate() + 1);
            }
            if (fajrWindow.end <= bedtime) {
                fajrWindow.end.setDate(fajrWindow.end.getDate() + 1);
            }
        }

        if (workTime && workTime <= bedtime) {
            workTime.setDate(workTime.getDate() + 1);
        }

        if (mustWakeBy && mustWakeBy <= bedtime) {
            mustWakeBy.setDate(mustWakeBy.getDate() + 1);
        }

        const cycles = this.generateSleepCycles(bedtime, cycleLength, 6); // 6 cycles (9 hours)
        const windows = this.categorizeWakeWindows(cycles, cycleLength);
        
        // NEW APPROACH: Calculate realistic intersections
        let intersectionAnalysis = null;
        if (fajrMode === 'window' && fajrWindow && workTime) {
            intersectionAnalysis = this.calculateFajrWorkIntersections(cycles, fajrWindow, workTime, bedtime);
        } else if (fajrMode === 'fixed' && fajr && workTime) {
            // Treat fixed Fajr as a 10-minute window around the time
            const fajrWindowFixed = {
                start: this.addMinutes(fajr, -5),
                end: this.addMinutes(fajr, 5)
            };
            intersectionAnalysis = this.calculateFajrWorkIntersections(cycles, fajrWindowFixed, workTime, bedtime);
        }
        
        // Fallback to old optimization for backwards compatibility
        let fajrOptimization = null;
        if (fajrMode === 'window' && fajrWindow && !intersectionAnalysis) {
            fajrOptimization = this.optimizeFajrWindow(windows, fajrWindow, workTime, bedtime);
        }
        
        // Store data for export
        this.lastCalculation = {
            bedtime,
            fajr,
            fajrWindow,
            fajrOptimization,
            intersectionAnalysis,
            workTime,
            mustWakeBy,
            cycles,
            windows,
            cycleLength,
            workMode,
            fajrMode
        };
        
        this.displayResults(windows, fajr, cycles, cycleLength, mustWakeBy, workMode, fajrOptimization, intersectionAnalysis);
    }

    generateSleepCycles(bedtime, cycleLength, numCycles) {
        const cycles = [];
        let currentTime = new Date(bedtime);

        for (let i = 0; i < numCycles; i++) {
            const cycleStart = new Date(currentTime);
            const cycleEnd = this.addMinutes(currentTime, cycleLength);
            
            // More precise sleep stage timing
            const earlyLightStart = cycleStart; // 0 min
            const earlyLightEnd = this.addMinutes(cycleStart, Math.round(cycleLength * 0.22)); // ~20 min
            
            const deepSleepStart = this.addMinutes(cycleStart, Math.round(cycleLength * 0.28)); // ~25 min
            const deepSleepEnd = this.addMinutes(cycleStart, Math.round(cycleLength * 0.67)); // ~60 min
            
            const lateLightStart = this.addMinutes(cycleStart, Math.round(cycleLength * 0.67)); // ~60 min
            const lateLightEnd = this.addMinutes(cycleStart, Math.round(cycleLength * 0.78)); // ~70 min
            
            const remStart = this.addMinutes(cycleStart, Math.round(cycleLength * 0.89)); // ~80 min
            const remEnd = cycleEnd; // ~90 min
            
            cycles.push({
                number: i + 1,
                start: cycleStart,
                end: cycleEnd,
                length: cycleLength,
                stages: {
                    earlyLight: { start: earlyLightStart, end: earlyLightEnd },
                    deepSleep: { start: deepSleepStart, end: deepSleepEnd },
                    lateLight: { start: lateLightStart, end: lateLightEnd },
                    rem: { start: remStart, end: remEnd }
                }
            });

            currentTime = cycleEnd;
        }

        return cycles;
    }

    categorizeWakeWindows(cycles, cycleLength) {
        const windows = {
            best: [],
            okay: [],
            worst: []
        };

        cycles.forEach(cycle => {
            const stages = cycle.stages;
            
            // ✅ BEST: Early light sleep (0-20 min) - natural wake window
            windows.best.push({
                start: stages.earlyLight.start,
                end: stages.earlyLight.end,
                cycle: cycle.number,
                reason: 'Early light sleep - natural wake window',
                stage: 'early_light',
                quality: 'excellent'
            });

            // ✅ BEST: REM/End of cycle (80-90 min) - completion wake window  
            windows.best.push({
                start: stages.rem.start,
                end: stages.rem.end,
                cycle: cycle.number,
                reason: 'End of cycle - REM completion',
                stage: 'rem_end',
                quality: 'excellent'
            });

            // ⚠️ OKAY: Late light sleep (60-70 min) - pre-REM window
            windows.okay.push({
                start: stages.lateLight.start,
                end: stages.lateLight.end,
                cycle: cycle.number,
                reason: 'Light sleep before REM',
                stage: 'late_light', 
                quality: 'acceptable'
            });

            // ❌ WORST: Deep sleep (25-60 min) - avoid at all costs
            windows.worst.push({
                start: stages.deepSleep.start,
                end: stages.deepSleep.end,
                cycle: cycle.number,
                reason: 'Deep sleep - high grogginess risk',
                stage: 'deep',
                quality: 'poor'
            });

            // Gap between early light and deep sleep (20-25 min) - transition period
            const transitionStart = stages.earlyLight.end;
            const transitionEnd = stages.deepSleep.start;
            if (transitionStart < transitionEnd) {
                windows.okay.push({
                    start: transitionStart,
                    end: transitionEnd,
                    cycle: cycle.number,
                    reason: 'Transition to deep sleep',
                    stage: 'transition',
                    quality: 'marginal'
                });
            }

            // Gap between late light and REM (70-80 min) - REM preparation
            const remPrepStart = stages.lateLight.end;
            const remPrepEnd = stages.rem.start;
            if (remPrepStart < remPrepEnd) {
                windows.okay.push({
                    start: remPrepStart,
                    end: remPrepEnd,
                    cycle: cycle.number,
                    reason: 'REM preparation phase',
                    stage: 'rem_prep',
                    quality: 'marginal'
                });
            }
        });

        return windows;
    }

    analyzeFajrTiming(fajr, cycles, cycleLength) {
        if (!fajr) return null;

        for (const cycle of cycles) {
            if (fajr >= cycle.start && fajr <= cycle.end) {
                const cycleProgress = (fajr - cycle.start) / (cycle.end - cycle.start);
                const progressMinutes = Math.round(cycleProgress * cycleLength);
                const stages = cycle.stages;

                let timing, recommendation, stage, quality;

                // Check which stage Fajr falls into
                if (fajr >= stages.earlyLight.start && fajr <= stages.earlyLight.end) {
                    timing = 'best';
                    stage = 'Early Light Sleep';
                    quality = 'excellent';
                    recommendation = '✅ Excellent! Fajr falls during early light sleep - natural wake window.';
                } else if (fajr >= stages.deepSleep.start && fajr <= stages.deepSleep.end) {
                    timing = 'worst';
                    stage = 'Deep Sleep';
                    quality = 'poor';
                    recommendation = '❌ WARNING: Fajr falls during deep sleep. You will feel groggy. Consider staying awake after prayer.';
                } else if (fajr >= stages.lateLight.start && fajr <= stages.lateLight.end) {
                    timing = 'okay';
                    stage = 'Late Light Sleep';
                    quality = 'acceptable';
                    recommendation = '⚠️ Acceptable: Fajr falls during light sleep before REM. Some drowsiness possible.';
                } else if (fajr >= stages.rem.start && fajr <= stages.rem.end) {
                    timing = 'best';
                    stage = 'REM/End of Cycle';
                    quality = 'excellent';
                    recommendation = '✅ Perfect! Fajr falls during REM/end of cycle - optimal wake time.';
                } else {
                    // Transition periods
                    timing = 'okay';
                    stage = 'Transition Phase';
                    quality = 'marginal';
                    recommendation = '⚠️ Okay: Fajr falls during sleep transition. Moderate wake quality.';
                }

                // Find next best wake time
                const nextBestCycle = cycles.find(c => c.number > cycle.number);
                const nextBestTime = nextBestCycle ? this.formatTime(nextBestCycle.stages.rem.start) : null;

                return {
                    cycle: cycle.number,
                    timing,
                    stage,
                    quality,
                    progressMinutes,
                    recommendation,
                    nextBestTime,
                    exactTiming: `${Math.round(progressMinutes)} minutes into cycle ${cycle.number}`
                };
            }
        }

        return null;
    }

    calculateFajrWorkIntersections(cycles, fajrWindow, workTime, bedtime) {
        let pairings = {
            best: [],
            okay: [],
            bad: [],
            totalSleepTime: 0,
            hasViableOptions: false
        };

        // NEW APPROACH: Find Fajr+Work pairings across different cycles
        cycles.forEach(fajrCycle => {
            const fajrStages = fajrCycle.stages;
            
            // Define Fajr wake windows in this cycle
            const fajrWindows = [
                // Early light sleep (0-20 min) - Best for Fajr
                {
                    start: fajrStages.earlyLight.start,
                    end: fajrStages.earlyLight.end,
                    fajrClassification: 'best',
                    stage: 'early_light',
                    reason: 'Early light sleep - natural wake window',
                    quality: 'excellent'
                },
                // Deep sleep (25-60 min) - Bad for Fajr
                {
                    start: fajrStages.deepSleep.start,
                    end: fajrStages.deepSleep.end,
                    fajrClassification: 'bad',
                    stage: 'deep',
                    reason: 'Deep sleep - high grogginess risk',
                    quality: 'poor'
                },
                // Late light sleep (60-70 min) - Okay for Fajr
                {
                    start: fajrStages.lateLight.start,
                    end: fajrStages.lateLight.end,
                    fajrClassification: 'okay',
                    stage: 'late_light',
                    reason: 'Late light sleep - pre-REM window',
                    quality: 'acceptable'
                },
                // REM/End of cycle (80-90 min) - Best for Fajr
                {
                    start: fajrStages.rem.start,
                    end: fajrStages.rem.end,
                    fajrClassification: 'best',
                    stage: 'rem_end',
                    reason: 'End of cycle - REM completion',
                    quality: 'excellent'
                }
            ];

            // Add Fajr transition windows
            const fajrTransitionStart = fajrStages.earlyLight.end;
            const fajrTransitionEnd = fajrStages.deepSleep.start;
            if (fajrTransitionStart < fajrTransitionEnd) {
                fajrWindows.push({
                    start: fajrTransitionStart,
                    end: fajrTransitionEnd,
                    fajrClassification: 'okay',
                    stage: 'transition',
                    reason: 'Transition to deep sleep',
                    quality: 'marginal'
                });
            }

            const fajrRemPrepStart = fajrStages.lateLight.end;
            const fajrRemPrepEnd = fajrStages.rem.start;
            if (fajrRemPrepStart < fajrRemPrepEnd) {
                fajrWindows.push({
                    start: fajrRemPrepStart,
                    end: fajrRemPrepEnd,
                    fajrClassification: 'okay',
                    stage: 'rem_prep',
                    reason: 'REM preparation phase',
                    quality: 'marginal'
                });
            }

            // Check each Fajr window
            fajrWindows.forEach(fajrWindow_item => {
                // Check if this Fajr window overlaps with user's Fajr time
                const fajrOverlap = this.calculateOverlap(fajrWindow_item, fajrWindow);
                if (!fajrOverlap) return; // No Fajr overlap

                // CRITICAL: Now find what sleep stage work wake-up falls into
                const workStage = this.findWorkStageInCycles(workTime, cycles);
                if (!workStage) return; // Work time doesn't fall in any cycle

                // CLASSIFICATION LOGIC: Combined Fajr+Work assessment
                let finalClassification, combinedReason, combinedQuality;

                if (fajrWindow_item.fajrClassification === 'best' && workStage.classification === 'best') {
                    finalClassification = 'best';
                    combinedReason = `Fajr: ${fajrWindow_item.reason} | Work: ${workStage.reason}`;
                    combinedQuality = 'excellent';
                } else if (fajrWindow_item.fajrClassification === 'bad' || workStage.classification === 'bad') {
                    // If EITHER Fajr OR Work is bad, the whole pairing is bad
                    finalClassification = 'bad';
                    combinedReason = `${fajrWindow_item.fajrClassification === 'bad' ? 'Fajr' : 'Work'} wake during deep sleep - guaranteed grogginess`;
                    combinedQuality = 'poor';
                } else {
                    // Both are okay or mixed okay/best
                    finalClassification = 'okay';
                    combinedReason = `Fajr: ${fajrWindow_item.reason} | Work: ${workStage.reason}`;
                    combinedQuality = fajrWindow_item.fajrClassification === 'best' || workStage.classification === 'best' ? 'good' : 'acceptable';
                }

                // Calculate pairing details
                const pairing = {
                    fajrStart: fajrOverlap.start,
                    fajrEnd: fajrOverlap.end,
                    workTime: workTime,
                    workStage: workStage,
                    fajrCycle: fajrCycle.number,
                    workCycle: workStage.cycle,
                    classification: finalClassification,
                    fajrStage: fajrWindow_item.stage,
                    reason: combinedReason,
                    quality: combinedQuality,
                    sleepDuration: (fajrOverlap.start - bedtime) / (1000 * 60 * 60), // hours
                    timeUntilWork: (workTime - fajrOverlap.end) / (1000 * 60), // minutes
                    fajrDurationMinutes: Math.round((fajrOverlap.end - fajrOverlap.start) / (1000 * 60)),
                    viable: (workTime - fajrOverlap.end) >= 30 * 60 * 1000, // At least 30 min before work
                    fajrReason: fajrWindow_item.reason,
                    workReason: workStage.reason
                };

                // Add to appropriate category
                pairings[finalClassification].push(pairing);
                
                if (pairing.viable && finalClassification !== 'bad') {
                    pairings.hasViableOptions = true;
                }
            });
        });

        // Calculate total sleep time from first viable option
        const allPairings = [...pairings.best, ...pairings.okay, ...pairings.bad];
        if (allPairings.length > 0) {
            const earliestViable = allPairings
                .filter(p => p.viable)
                .sort((a, b) => a.sleepDuration - b.sleepDuration)[0];
            pairings.totalSleepTime = earliestViable ? earliestViable.sleepDuration : 0;
        }

        // Sort each category by sleep duration (more sleep is better)
        ['best', 'okay', 'bad'].forEach(category => {
            pairings[category].sort((a, b) => b.sleepDuration - a.sleepDuration);
        });

        // Generate suggested alternatives (healthy cycles regardless of work alignment)
        pairings.suggestedAlternatives = this.calculateSuggestedAlternatives(cycles, fajrWindow, workTime, bedtime);

        // Apply proximity-based filtering to prioritize closest options
        pairings = this.applyProximityFiltering(pairings, fajrWindow, workTime);

        // Generate overall analysis
        pairings.analysis = this.generateIntersectionAnalysis(pairings, bedtime, fajrWindow, workTime);

        return pairings;
    }

    findWorkStageInCycles(workTime, cycles) {
        for (const cycle of cycles) {
            if (workTime >= cycle.start && workTime <= cycle.end) {
                const stages = cycle.stages;
                
                // Check which stage work falls into
                if (workTime >= stages.earlyLight.start && workTime <= stages.earlyLight.end) {
                    return {
                        classification: 'best',
                        stage: 'early_light',
                        reason: 'Early light sleep - natural wake window',
                        cycle: cycle.number
                    };
                } else if (workTime >= stages.deepSleep.start && workTime <= stages.deepSleep.end) {
                    return {
                        classification: 'bad',
                        stage: 'deep',
                        reason: 'Deep sleep - high grogginess risk',
                        cycle: cycle.number
                    };
                } else if (workTime >= stages.lateLight.start && workTime <= stages.lateLight.end) {
                    return {
                        classification: 'okay',
                        stage: 'late_light',
                        reason: 'Late light sleep - pre-REM window',
                        cycle: cycle.number
                    };
                } else if (workTime >= stages.rem.start && workTime <= stages.rem.end) {
                    return {
                        classification: 'best',
                        stage: 'rem_end',
                        reason: 'End of cycle - REM completion',
                        cycle: cycle.number
                    };
                } else {
                    // Transition periods
                    return {
                        classification: 'okay',
                        stage: 'transition',
                        reason: 'Sleep transition phase',
                        cycle: cycle.number
                    };
                }
            }
        }
        return null; // Work time doesn't fall in any cycle
    }

    calculateSuggestedAlternatives(cycles, fajrWindow, workTime, bedtime) {
        const alternatives = {
            coupledPairs: [],
            workStageInfo: null,
            hasGoodOptions: false
        };

        // Find what stage work time falls into for reference
        alternatives.workStageInfo = this.findWorkStageInCycles(workTime, cycles);

        // STEP 1: Find all healthy Fajr windows within Fajr time range
        const fajrOptions = [];
        cycles.forEach(cycle => {
            const stages = cycle.stages;
            
            const fajrWindows = [
                // Early light sleep (0-20 min) - Best
                {
                    start: stages.earlyLight.start,
                    end: stages.earlyLight.end,
                    classification: 'best',
                    stage: 'early_light',
                    reason: 'Early light sleep - natural wake window',
                    quality: 'excellent'
                },
                // Late light sleep (60-70 min) - Okay
                {
                    start: stages.lateLight.start,
                    end: stages.lateLight.end,
                    classification: 'okay',
                    stage: 'late_light',
                    reason: 'Late light sleep - pre-REM window',
                    quality: 'acceptable'
                },
                // REM/End of cycle (80-90 min) - Best
                {
                    start: stages.rem.start,
                    end: stages.rem.end,
                    classification: 'best',
                    stage: 'rem_end',
                    reason: 'End of cycle - REM completion',
                    quality: 'excellent'
                }
            ];

            // Add transition windows
            const transitionStart = stages.earlyLight.end;
            const transitionEnd = stages.deepSleep.start;
            if (transitionStart < transitionEnd) {
                fajrWindows.push({
                    start: transitionStart,
                    end: transitionEnd,
                    classification: 'okay',
                    stage: 'transition',
                    reason: 'Transition to deep sleep',
                    quality: 'marginal'
                });
            }

            const remPrepStart = stages.lateLight.end;
            const remPrepEnd = stages.rem.start;
            if (remPrepStart < remPrepEnd) {
                fajrWindows.push({
                    start: remPrepStart,
                    end: remPrepEnd,
                    classification: 'okay',
                    stage: 'rem_prep',
                    reason: 'REM preparation phase',
                    quality: 'marginal'
                });
            }

            // Check for Fajr window overlaps
            fajrWindows.forEach(window => {
                const fajrOverlap = this.calculateOverlap(window, fajrWindow);
                if (fajrOverlap) {
                    fajrOptions.push({
                        start: fajrOverlap.start,
                        end: fajrOverlap.end,
                        cycle: cycle.number,
                        classification: window.classification,
                        stage: window.stage,
                        reason: window.reason,
                        quality: window.quality,
                        sleepDuration: (fajrOverlap.start - bedtime) / (1000 * 60 * 60),
                        durationMinutes: Math.round((fajrOverlap.end - fajrOverlap.start) / (1000 * 60))
                    });
                }
            });
        });

        // STEP 2: Find healthy work windows (before, at, or slightly after work time)
        const workOptions = [];
        cycles.forEach(cycle => {
            const stages = cycle.stages;
            
            const workWindows = [
                // Early light sleep (0-20 min) - Best
                {
                    start: stages.earlyLight.start,
                    end: stages.earlyLight.end,
                    classification: 'best',
                    stage: 'early_light',
                    reason: 'Early light sleep - natural wake window'
                },
                // Late light sleep (60-70 min) - Okay
                {
                    start: stages.lateLight.start,
                    end: stages.lateLight.end,
                    classification: 'okay',
                    stage: 'late_light',
                    reason: 'Late light sleep - pre-REM window'
                },
                // REM/End of cycle (80-90 min) - Best
                {
                    start: stages.rem.start,
                    end: stages.rem.end,
                    classification: 'best',
                    stage: 'rem_end',
                    reason: 'End of cycle - REM completion'
                }
            ];

            // Add transition windows
            if (stages.earlyLight.end < stages.deepSleep.start) {
                workWindows.push({
                    start: stages.earlyLight.end,
                    end: stages.deepSleep.start,
                    classification: 'okay',
                    stage: 'transition',
                    reason: 'Transition to deep sleep'
                });
            }

            if (stages.lateLight.end < stages.rem.start) {
                workWindows.push({
                    start: stages.lateLight.end,
                    end: stages.rem.start,
                    classification: 'okay',
                    stage: 'rem_prep',
                    reason: 'REM preparation phase'
                });
            }

            // Find windows that are close to work time (within 30 min before/after)
            workWindows.forEach(window => {
                const windowStart = window.start;
                const windowEnd = window.end;
                const timeDiffStart = Math.abs((workTime - windowStart) / (1000 * 60)); // minutes
                const timeDiffEnd = Math.abs((workTime - windowEnd) / (1000 * 60)); // minutes
                
                // Only include if within reasonable range of work time
                if (timeDiffStart <= 30 || timeDiffEnd <= 30 || 
                    (windowStart <= workTime && windowEnd >= workTime)) {
                    
                    let workAlignment = 'exact';
                    if (windowEnd < workTime) {
                        workAlignment = 'before_work';
                    } else if (windowStart > workTime) {
                        workAlignment = 'after_work';
                    }

                    workOptions.push({
                        start: windowStart,
                        end: windowEnd,
                        cycle: cycle.number,
                        classification: window.classification,
                        stage: window.stage,
                        reason: window.reason,
                        workAlignment,
                        timeDifference: Math.min(timeDiffStart, timeDiffEnd),
                        durationMinutes: Math.round((windowEnd - windowStart) / (1000 * 60))
                    });
                }
            });
        });

        // STEP 3: Create coupled pairs (best Fajr with best Work)
        // Calculate proximity to Fajr window center for each option
        const fajrWindowCenter = new Date((fajrWindow.start.getTime() + fajrWindow.end.getTime()) / 2);
        
        const sortedFajr = fajrOptions.sort((a, b) => {
            if (a.classification !== b.classification) {
                return a.classification === 'best' ? -1 : 1;
            }
            // Sort by proximity to Fajr window center
            const aDistance = Math.min(Math.abs(a.start - fajrWindowCenter), Math.abs(a.end - fajrWindowCenter));
            const bDistance = Math.min(Math.abs(b.start - fajrWindowCenter), Math.abs(b.end - fajrWindowCenter));
            return aDistance - bDistance;
        });

        const sortedWork = workOptions.sort((a, b) => {
            if (a.classification !== b.classification) {
                return a.classification === 'best' ? -1 : 1;
            }
            return a.timeDifference - b.timeDifference; // Closer to work time is better
        });

        // Create smart coupled pairs ensuring Fajr and Work are different windows
        const usedFajrWindows = new Set();
        const usedWorkWindows = new Set();

        for (let i = 0; i < Math.min(3, sortedFajr.length) && alternatives.coupledPairs.length < 4; i++) {
            const fajrOption = sortedFajr[i];
            const fajrKey = `${fajrOption.start.getTime()}-${fajrOption.end.getTime()}`;
            
            if (usedFajrWindows.has(fajrKey)) continue;

            for (let j = 0; j < Math.min(3, sortedWork.length); j++) {
                const workOption = sortedWork[j];
                const workKey = `${workOption.start.getTime()}-${workOption.end.getTime()}`;

                // Skip if we've used this work window or if Fajr and Work windows are the same
                if (usedWorkWindows.has(workKey) || 
                    (fajrOption.start.getTime() === workOption.start.getTime() && 
                     fajrOption.end.getTime() === workOption.end.getTime())) {
                    continue;
                }

                // Ensure Fajr window is before work window (logical order)
                if (fajrOption.end > workOption.start) {
                    continue;
                }

                // Determine overall classification for the pair
                let pairClassification = 'okay';
                if (fajrOption.classification === 'best' && workOption.classification === 'best') {
                    pairClassification = 'best';
                } else if (fajrOption.classification === 'bad' || workOption.classification === 'bad') {
                    pairClassification = 'bad';
                }

                // Check if work is misaligned
                const workMisaligned = workOption.workAlignment !== 'exact';
                const misalignmentWarning = this.generateMisalignmentWarning(workOption, workTime);

                alternatives.coupledPairs.push({
                    fajr: fajrOption,
                    work: workOption,
                    classification: pairClassification,
                    workMisaligned,
                    misalignmentWarning,
                    totalSleepHours: fajrOption.sleepDuration
                });

                if (pairClassification === 'best') {
                    alternatives.hasGoodOptions = true;
                }

                // Mark these windows as used
                usedFajrWindows.add(fajrKey);
                usedWorkWindows.add(workKey);
                break; // Move to next Fajr option
            }
        }

        // Sort pairs by classification and sleep duration
        alternatives.coupledPairs.sort((a, b) => {
            if (a.classification !== b.classification) {
                const order = { best: 3, okay: 2, bad: 1 };
                return order[b.classification] - order[a.classification];
            }
            return b.totalSleepHours - a.totalSleepHours;
        });

        return alternatives;
    }

    generateMisalignmentWarning(workOption, workTime) {
        if (workOption.workAlignment === 'exact') {
            return null;
        }

        const timeDiff = Math.round(workOption.timeDifference);
        if (workOption.workAlignment === 'before_work') {
            return `Optimal work wake is ${timeDiff} min before your scheduled ${this.formatTime(workTime)}`;
        } else {
            return `Optimal work wake is ${timeDiff} min after your scheduled ${this.formatTime(workTime)}`;
        }
    }

    getWorkConsequence(workAlignment, timeToWork, workStageInfo) {
        if (!workStageInfo) {
            return 'Work time falls outside sleep cycles';
        }

        if (workAlignment === 'after_work') {
            return `You'll miss work! This Fajr time is after ${this.formatTime(new Date())}`;
        }

        if (workAlignment === 'too_close') {
            return `Only ${Math.round(timeToWork)} minutes to prepare for work - very tight schedule`;
        }

        // workAlignment === 'before_work'
        const workQuality = workStageInfo.classification;
        if (workQuality === 'best') {
            return `✅ Work at perfect time (${workStageInfo.reason})`;
        } else if (workQuality === 'okay') {
            return `⚠️ Work during acceptable phase (${workStageInfo.reason})`;
        } else {
            return `❌ Work wake will cause grogginess (${workStageInfo.reason})`;
        }
    }

    calculateOverlap(window, fajrWindow) {
        const overlapStart = new Date(Math.max(window.start, fajrWindow.start));
        const overlapEnd = new Date(Math.min(window.end, fajrWindow.end));
        
        if (overlapStart >= overlapEnd) {
            return null; // No overlap
        }
        
        return { start: overlapStart, end: overlapEnd };
    }

    // Universal proximity-based window selection
    selectClosestHealthyWindow(windows, targetTime, priorityOrder = ['best', 'okay']) {
        // Filter windows to only include healthy options (exclude 'bad')
        const healthyWindows = windows.filter(w => priorityOrder.includes(w.classification));
        
        if (healthyWindows.length === 0) return null;

        // Calculate proximity to target for each window
        const windowsWithProximity = healthyWindows.map(window => {
            // Calculate distance from target to both start and end of window
            const distanceToStart = Math.abs(targetTime - window.start);
            const distanceToEnd = Math.abs(targetTime - window.end);
            const proximityScore = Math.min(distanceToStart, distanceToEnd);
            
            return {
                ...window,
                proximityScore,
                targetDistance: proximityScore / (1000 * 60), // in minutes
            };
        });

        // Sort by: 1) Classification priority, 2) Proximity to target
        windowsWithProximity.sort((a, b) => {
            // First priority: classification (best > okay)
            const classificationOrder = { best: 2, okay: 1, bad: 0 };
            if (a.classification !== b.classification) {
                return classificationOrder[b.classification] - classificationOrder[a.classification];
            }
            
            // Second priority: proximity to target time
            return a.proximityScore - b.proximityScore;
        });

        return windowsWithProximity[0]; // Return closest healthy option
    }

    applyProximityFiltering(pairings, fajrWindow, workTime) {
        const fajrCenter = new Date((fajrWindow.start.getTime() + fajrWindow.end.getTime()) / 2);
        
        // Helper function to calculate proximity scores for pairings
        const calculatePairingProximity = (pairing) => {
            // Distance from Fajr window center to pairing Fajr time
            const fajrDistance = Math.min(
                Math.abs(pairing.fajrStart - fajrCenter),
                Math.abs(pairing.fajrEnd - fajrCenter)
            ) / (1000 * 60); // in minutes
            
            // Distance from work time to pairing work time  
            const workDistance = Math.abs(pairing.workTime - workTime) / (1000 * 60); // in minutes
            
            // Combined proximity score (closer is better)
            return {
                ...pairing,
                fajrProximity: fajrDistance,
                workProximity: workDistance,
                totalProximity: fajrDistance + workDistance
            };
        };
        
        // Apply proximity scoring to each category
        ['best', 'okay', 'bad'].forEach(category => {
            if (pairings[category].length > 0) {
                // Add proximity scores
                const withProximity = pairings[category].map(calculatePairingProximity);
                
                // Sort by proximity (closest first) while maintaining sleep quality priority
                withProximity.sort((a, b) => {
                    // If same quality, sort by proximity
                    return a.totalProximity - b.totalProximity;
                });
                
                // Keep only the closest 3 options per category to avoid overwhelming user
                pairings[category] = withProximity.slice(0, 3);
            }
        });
        
        return pairings;
    }

    generateProximityWarning(pairing, intersections) {
        if (!pairing.fajrProximity && !pairing.workProximity) return '';
        
        let warnings = [];
        
        // Warn about Fajr proximity if > 15 minutes away
        if (pairing.fajrProximity > 15) {
            warnings.push(`Fajr window is ${Math.round(pairing.fajrProximity)} min from your preferred time`);
        }
        
        // Warn about work proximity if > 10 minutes away  
        if (pairing.workProximity > 10) {
            warnings.push(`Work time is ${Math.round(pairing.workProximity)} min from your scheduled 7:00 AM`);
        }
        
        if (warnings.length === 0) return '';
        
        const warningClass = pairing.classification === 'best' ? 'text-orange-600 bg-orange-100' : 
                            pairing.classification === 'okay' ? 'text-orange-700 bg-orange-100' : 
                            'text-red-700 bg-red-100';
        
        return `
            <div class="text-xs mt-2 p-2 rounded ${warningClass}">
                <strong>⚠️ Proximity Notice:</strong> ${warnings.join('. ')}. 
                ${pairing.classification === 'best' ? 'This is the closest healthy option available.' : 
                  'Consider sleeping earlier for better alignment.'}
            </div>`;
    }

    generateIntersectionAnalysis(intersections, bedtime, fajrWindow, workTime) {
        const totalOptions = intersections.best.length + intersections.okay.length + intersections.bad.length;
        const viableOptions = intersections.best.length + intersections.okay.filter(o => o.viable).length;
        const bestOptions = intersections.best.length;
        
        let status, message, suggestions = [];

        if (totalOptions === 0) {
            status = 'no_intersections';
            message = '❌ No wake-up windows found that satisfy both Fajr and work constraints.';
            suggestions = [
                'Adjust your Fajr prayer window',
                'Consider changing your bedtime',
                'Move work start time later if possible'
            ];
        } else if (viableOptions === 0) {
            status = 'no_viable';
            message = '🚨 Schedule intersection found, but all options create work conflicts or insufficient rest time.';
            suggestions = [
                'Sleep earlier to allow for proper cycles',
                'Stay awake after Fajr instead of broken sleep',
                'Adjust work start time if possible'
            ];
        } else if (bestOptions > 0) {
            status = 'optimal';
            message = `✅ ${bestOptions} excellent option${bestOptions > 1 ? 's' : ''} found where Fajr aligns with REM completion.`;
            suggestions = [];
        } else {
            status = 'acceptable';
            message = `⚠️ ${viableOptions} acceptable option${viableOptions > 1 ? 's' : ''} found, but no perfect REM completion windows.`;
            suggestions = ['Consider going to bed earlier for better cycle alignment'];
        }

        // Add sleep duration warning
        if (intersections.totalSleepTime < 6) {
            suggestions.unshift('You are getting less than 6 hours of sleep - this will cause fatigue regardless of cycle timing');
        }

        return { status, message, suggestions, totalOptions, viableOptions, bestOptions };
    }

    optimizeFajrWindow(windows, fajrWindow, workTime, bedtime) {
        // Find all wake windows that fall within the Fajr prayer window
        const allWindows = [
            ...windows.best.map(w => ({...w, type: 'best', priority: 3})),
            ...windows.okay.map(w => ({...w, type: 'okay', priority: 2})),
            ...windows.worst.map(w => ({...w, type: 'worst', priority: 1}))
        ];

        // Filter windows that overlap with Fajr window
        const fajrCompatibleWindows = allWindows.filter(window => {
            return (window.start <= fajrWindow.end && window.end >= fajrWindow.start);
        });

        // Calculate sleep duration and cycle interruption for each option
        const recommendations = fajrCompatibleWindows.map(window => {
            // Find the optimal wake time within both the sleep window and Fajr window
            const optimalWakeTime = new Date(Math.max(window.start, fajrWindow.start));
            const latestWakeTime = new Date(Math.min(window.end, fajrWindow.end));
            
            if (optimalWakeTime > latestWakeTime) return null; // No overlap
            
            const sleepDuration = (optimalWakeTime - bedtime) / (1000 * 60 * 60); // hours
            const timeUntilWork = workTime ? (workTime - optimalWakeTime) / (1000 * 60) : null; // minutes
            
            // CRITICAL: Check for cycle interruption if going back to sleep
            let cycleInterruption = null;
            let postFajrWarning = null;
            
            if (workTime && timeUntilWork > 0) {
                cycleInterruption = this.analyzeCycleInterruption(optimalWakeTime, workTime);
                if (cycleInterruption.willInterrupt) {
                    postFajrWarning = this.generateInterruptionWarning(cycleInterruption, optimalWakeTime, workTime);
                }
            }
            
            // Adjust feasibility based on cycle interruption
            const baseFeasible = !workTime || timeUntilWork >= 30;
            const finalFeasible = baseFeasible && (!cycleInterruption?.willInterrupt || cycleInterruption?.acceptableInterruption);
            
            return {
                wakeTime: optimalWakeTime,
                latestWakeTime,
                sleepType: window.type,
                priority: window.priority,
                sleepDuration,
                timeUntilWork,
                cycle: window.cycle,
                reason: window.reason,
                feasible: finalFeasible,
                cycleInterruption,
                postFajrWarning,
                // Penalty for cycle interruption
                adjustedPriority: cycleInterruption?.willInterrupt ? window.priority - 2 : window.priority
            };
        }).filter(Boolean);

        // Sort by adjusted priority considering cycle interruption
        recommendations.sort((a, b) => {
            // Heavily penalize cycle interruption scenarios
            if (!a.cycleInterruption?.willInterrupt && b.cycleInterruption?.willInterrupt) return -1;
            if (a.cycleInterruption?.willInterrupt && !b.cycleInterruption?.willInterrupt) return 1;
            
            if (a.feasible && !b.feasible) return -1;
            if (!a.feasible && b.feasible) return 1;
            if (a.adjustedPriority !== b.adjustedPriority) return b.adjustedPriority - a.adjustedPriority;
            return b.sleepDuration - a.sleepDuration;
        });

        // Enhanced feasibility analysis
        const totalSleepTime = recommendations.length > 0 ? recommendations[0].sleepDuration : 0;
        const minRecommendedSleep = 6;
        const hasViableOption = recommendations.some(r => r.feasible && !r.cycleInterruption?.willInterrupt);
        const scheduleViable = totalSleepTime >= minRecommendedSleep && hasViableOption;

        return {
            recommendations: recommendations.slice(0, 3),
            scheduleViable,
            totalSleepTime,
            hasViableOption,
            analysis: this.generateFajrAnalysis(recommendations, scheduleViable, fajrWindow, workTime, hasViableOption)
        };
    }

    analyzeCycleInterruption(fajrWakeTime, workTime) {
        const cycleLength = parseInt(document.getElementById('cycleLength').value);
        const timeUntilWork = (workTime - fajrWakeTime) / (1000 * 60); // minutes
        
        // If less than 70 minutes until work, any sleep will be interrupted
        if (timeUntilWork < 70) {
            return {
                willInterrupt: true,
                timeAvailable: timeUntilWork,
                cycleProgress: null,
                severity: 'high',
                acceptableInterruption: false,
                reason: 'Insufficient time for any meaningful sleep cycle'
            };
        }
        
        // Calculate where work wake-up falls in a potential new cycle
        const newCycleProgress = timeUntilWork % cycleLength;
        const cyclePart = newCycleProgress / cycleLength;
        
        // Determine sleep stage at work wake-up time
        let stage, severity, acceptableInterruption;
        
        if (cyclePart <= 0.22) { // Light sleep (0-20% of cycle)
            stage = 'light';
            severity = 'low';
            acceptableInterruption = true;
        } else if (cyclePart <= 0.67) { // Deep sleep (22-67% of cycle)
            stage = 'deep';
            severity = 'high';
            acceptableInterruption = false;
        } else { // REM/transition (67-100% of cycle)
            stage = 'rem';
            severity = 'medium';
            acceptableInterruption = true;
        }
        
        return {
            willInterrupt: true,
            timeAvailable: timeUntilWork,
            cycleProgress: newCycleProgress,
            cyclePart: cyclePart,
            stage,
            severity,
            acceptableInterruption,
            reason: `Work wake-up falls during ${stage} sleep (${Math.round(cyclePart * 100)}% into new cycle)`
        };
    }

    generateInterruptionWarning(interruption, fajrTime, workTime) {
        const fajrTimeStr = this.formatTime(fajrTime);
        const workTimeStr = this.formatTime(workTime);
        const availableMinutes = Math.round(interruption.timeAvailable);
        
        if (interruption.timeAvailable < 70) {
            return {
                type: 'critical',
                icon: '🚨',
                message: `CRITICAL: Only ${availableMinutes} minutes between Fajr (${fajrTimeStr}) and work (${workTimeStr}). Any attempt to sleep will be severely interrupted.`,
                advice: 'Stay awake after Fajr - going back to sleep will make you feel worse.'
            };
        }
        
        if (interruption.severity === 'high') {
            return {
                type: 'warning',
                icon: '⚠️',
                message: `WARNING: Work at ${workTimeStr} forces wake-up during deep sleep phase. You will feel groggy despite good Fajr timing.`,
                advice: 'Consider staying awake after Fajr or adjusting your bedtime to avoid this conflict.'
            };
        }
        
        if (interruption.severity === 'medium') {
            return {
                type: 'caution',
                icon: '⚠️',
                message: `CAUTION: Work wake-up at ${workTimeStr} interrupts REM sleep. Some grogginess expected.`,
                advice: 'Acceptable but not ideal. Consider coffee or light exposure before work.'
            };
        }
        
        return {
            type: 'acceptable',
            icon: '✅',
            message: `Post-Fajr sleep ending at ${workTimeStr} falls during light sleep. Minimal disruption expected.`,
            advice: 'This schedule should work reasonably well.'
        };
    }

    generateFajrAnalysis(recommendations, scheduleViable, fajrWindow, workTime, hasViableOption) {
        if (!scheduleViable || !hasViableOption) {
            const hasCycleConflicts = recommendations.some(r => r.cycleInterruption?.willInterrupt && r.cycleInterruption.severity === 'high');
            
            let message = 'Your current schedule may not provide sufficient sleep.';
            let suggestions = ['Move bedtime earlier for more sleep'];
            
            if (hasCycleConflicts) {
                message = '❌ No fully healthy schedule available. All Fajr options lead to cycle interruption at work time.';
                suggestions = [
                    'Sleep earlier to allow for complete cycles',
                    'Stay awake after Fajr instead of broken sleep',
                    'Consider adjusting work start time if possible',
                    'Accept grogginess and use caffeine/light therapy'
                ];
            }
            
            return {
                status: 'not_viable',
                message,
                suggestions,
                hasConflicts: hasCycleConflicts
            };
        }

        if (recommendations.length === 0) {
            return {
                status: 'no_overlap',
                message: 'No good wake-up windows overlap with your Fajr time range.',
                suggestions: [
                    'Adjust your Fajr prayer window',
                    'Consider changing your bedtime',
                    'You may need to wake during a suboptimal sleep phase'
                ]
            };
        }

        const bestRec = recommendations[0];
        let status = 'optimal';
        let message = '';

        // Check for cycle interruption issues
        if (bestRec.cycleInterruption?.willInterrupt) {
            if (bestRec.cycleInterruption.severity === 'high') {
                status = 'problematic';
                message = `⚠️ ${bestRec.postFajrWarning.message}`;
            } else if (bestRec.cycleInterruption.severity === 'medium') {
                status = 'acceptable_with_warning';
                message = `⚠️ ${bestRec.postFajrWarning.message}`;
            } else {
                status = 'good';
                message = `✅ ${bestRec.postFajrWarning.message}`;
            }
        } else {
            // No cycle interruption - original logic
            if (bestRec.sleepType === 'best') {
                message = `Excellent! You can wake up during REM sleep for Fajr and still have ${Math.round(bestRec.timeUntilWork || 0)} minutes before work.`;
            } else if (bestRec.sleepType === 'okay') {
                message = `Good option! Waking during light sleep phase. You'll get ${bestRec.sleepDuration.toFixed(1)} hours of sleep.`;
                status = 'good';
            } else {
                message = `Not ideal, but manageable. You'll wake during deep sleep, which may cause some grogginess.`;
                status = 'acceptable';
            }
        }

        return {
            status,
            message,
            bestOption: bestRec,
            suggestions: this.generateFajrSuggestions(recommendations, workTime),
            hasCycleInterruption: bestRec.cycleInterruption?.willInterrupt
        };
    }

    generateFajrSuggestions(recommendations, workTime) {
        const suggestions = [];
        
        if (recommendations.length > 1) {
            suggestions.push(`Alternative: Wake at ${this.formatTime(recommendations[1].wakeTime)} (${recommendations[1].sleepType} sleep quality)`);
        }
        
        if (workTime) {
            const bestRec = recommendations[0];
            if (bestRec.timeUntilWork < 60) {
                suggestions.push('Consider preparing for work the night before due to limited time');
            }
            if (bestRec.timeUntilWork > 120) {
                suggestions.push('You have time for post-Fajr rest or light activities');
            }
        }
        
        suggestions.push('Consider setting a gentle alarm 10-15 minutes before your optimal wake time');
        
        return suggestions;
    }

    displayResults(windows, fajr, cycles, cycleLength, mustWakeBy, workMode, fajrOptimization, intersectionAnalysis) {
        const resultsDiv = document.getElementById('results');
        const timelineDiv = document.getElementById('timeline');
        const fajrAnalysisDiv = document.getElementById('fajrAnalysis');
        const fajrContentDiv = document.getElementById('fajrContent');

        // Show results
        resultsDiv.classList.remove('hidden');

        // NEW: Intersection Analysis Display (takes priority over old optimization)
        const fajrOptimizationDiv = document.getElementById('fajrOptimization');
        const fajrOptimizationContentDiv = document.getElementById('fajrOptimizationContent');
        
        if (intersectionAnalysis) {
            fajrOptimizationDiv.classList.remove('hidden');
            this.displayIntersectionAnalysis(fajrOptimizationContentDiv, intersectionAnalysis);
        } else if (fajrOptimization) {
            fajrOptimizationDiv.classList.remove('hidden');
            this.displayFajrOptimization(fajrOptimizationContentDiv, fajrOptimization);
        } else {
            fajrOptimizationDiv.classList.add('hidden');
        }

        // Fajr analysis (for fixed time)
        if (fajr) {
            const fajrAnalysis = this.analyzeFajrTiming(fajr, cycles, cycleLength);
            if (fajrAnalysis) {
                fajrAnalysisDiv.classList.remove('hidden');
                
                const timingClass = {
                    best: 'text-sleep-best',
                    okay: 'text-sleep-okay',
                    worst: 'text-sleep-worst'
                }[fajrAnalysis.timing];

                fajrContentDiv.innerHTML = `
                    <div class="mb-4">
                        <div class="flex items-center justify-between mb-2">
                            <span class="font-medium">Fajr Time:</span> 
                            <span class="text-sm font-mono bg-gray-100 px-2 py-1 rounded">${this.formatTime(fajr)}</span>
                        </div>
                        <div class="text-sm text-gray-600">${fajrAnalysis.exactTiming}</div>
                    </div>
                    
                    <div class="mb-4 p-3 rounded-lg ${
                        fajrAnalysis.timing === 'best' ? 'bg-green-50 border border-green-200' :
                        fajrAnalysis.timing === 'okay' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-red-50 border border-red-200'
                    }">
                        <div class="flex items-center justify-between mb-2">
                            <span class="font-medium">Sleep Stage:</span> 
                            <span class="${timingClass} font-medium text-sm px-2 py-1 rounded">${fajrAnalysis.stage}</span>
                        </div>
                        <div class="text-sm">
                            <strong>Quality:</strong> ${fajrAnalysis.quality ? fajrAnalysis.quality.toUpperCase() : 'N/A'}
                        </div>
                    </div>
                    
                    <div class="mb-3">${fajrAnalysis.recommendation}</div>
                    
                    ${fajrAnalysis.nextBestTime && fajrAnalysis.timing === 'worst' ? 
                        `<div class="text-sm bg-blue-50 border border-blue-200 p-3 rounded">
                            💡 <strong>Post-Fajr Strategy:</strong> If you go back to sleep after Fajr, aim to wake up around ${fajrAnalysis.nextBestTime} to complete the cycle properly.
                        </div>` : ''
                    }
                    
                    ${fajrAnalysis.timing === 'worst' ? 
                        `<div class="text-sm bg-orange-50 border border-orange-200 p-3 rounded mt-3">
                            ⚠️ <strong>Alternative:</strong> Consider staying awake after Fajr prayer to avoid cycle interruption grogginess.
                        </div>` : ''
                    }
                `;
            }
        } else {
            fajrAnalysisDiv.classList.add('hidden');
        }

        // Clear previous timeline
        timelineDiv.innerHTML = '';

        // Handle work mode
        let workModeRecommendation = null;
        if (workMode && mustWakeBy) {
            workModeRecommendation = this.findBestWakeTimeForDeadline(windows, mustWakeBy);
        }

        // Create combined timeline
        const allWindows = [
            ...windows.best.map(w => ({...w, type: 'best'})),
            ...windows.okay.map(w => ({...w, type: 'okay'})),
            ...windows.worst.map(w => ({...w, type: 'worst'}))
        ].sort((a, b) => a.start - b.start);

        // Add work mode notification
        if (workModeRecommendation) {
            const workModeDiv = document.createElement('div');
            workModeDiv.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4';
            workModeDiv.innerHTML = `
                <h4 class="font-medium text-blue-800 mb-2">⏰ Work Mode Recommendation</h4>
                <p class="text-blue-700">${workModeRecommendation}</p>
            `;
            timelineDiv.appendChild(workModeDiv);
        }

        // Group by cycles for better display
        const cycleGroups = {};
        allWindows.forEach(window => {
            if (!cycleGroups[window.cycle]) {
                cycleGroups[window.cycle] = [];
            }
            cycleGroups[window.cycle].push(window);
        });

        Object.keys(cycleGroups).forEach(cycleNum => {
            const cycleDiv = document.createElement('div');
            cycleDiv.className = 'border-l-4 border-gray-300 pl-4 mb-6';
            
            // Cycle header with timing
            const cycleHeader = document.createElement('div');
            cycleHeader.className = 'flex items-center justify-between mb-3';
            cycleHeader.innerHTML = `
                <h4 class="font-medium text-gray-800">Sleep Cycle ${cycleNum}</h4>
                <span class="text-xs text-gray-500">${cycles[cycleNum - 1] ? `${this.formatTime(cycles[cycleNum - 1].start)} - ${this.formatTime(cycles[cycleNum - 1].end)}` : ''}</span>
            `;
            cycleDiv.appendChild(cycleHeader);

            // Sort windows by start time for this cycle
            const sortedWindows = cycleGroups[cycleNum].sort((a, b) => a.start - b.start);

            // Create windows container
            const windowsContainer = document.createElement('div');
            windowsContainer.className = 'space-y-2';

            sortedWindows.forEach(window => {
                const colorClass = {
                    best: 'bg-sleep-best text-white border-l-4 border-green-700',
                    okay: 'bg-sleep-okay text-white border-l-4 border-yellow-700',
                    worst: 'bg-sleep-worst text-white border-l-4 border-red-700'
                }[window.type];

                const icon = {
                    best: '✅',
                    okay: '⚠️',
                    worst: '❌'
                }[window.type];

                const durationMinutes = Math.round((window.end - window.start) / (1000 * 60));
                
                const windowDiv = document.createElement('div');
                windowDiv.className = `${colorClass} px-4 py-3 rounded-md text-sm`;
                windowDiv.innerHTML = `
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="font-medium">${icon} ${this.formatTime(window.start)} - ${this.formatTime(window.end)}</span>
                            <span class="text-xs opacity-80 ml-2">(${durationMinutes} min window)</span>
                        </div>
                        <div class="text-xs opacity-90 uppercase font-medium">
                            ${window.quality || 'STANDARD'}
                        </div>
                    </div>
                    <div class="text-xs opacity-90 mt-1">${window.reason}</div>
                    ${window.stage ? `<div class="text-xs opacity-75 mt-1">Stage: ${window.stage.replace('_', ' ').toUpperCase()}</div>` : ''}
                `;
                
                windowsContainer.appendChild(windowDiv);
            });

            cycleDiv.appendChild(windowsContainer);
            timelineDiv.appendChild(cycleDiv);
        });

        // Add realism warning if needed
        this.addRealismWarning(timelineDiv, windows, fajr, workMode, mustWakeBy, fajrOptimization, intersectionAnalysis);

        // Create visualization
        this.createVisualization(cycles, windows, fajr);
    }

    addRealismWarning(timelineDiv, windows, fajr, workMode, mustWakeBy, fajrOptimization, intersectionAnalysis) {
        let warningMessage = null;
        let warningType = 'info';

        // Check intersection analysis first (more accurate)
        if (intersectionAnalysis) {
            if (intersectionAnalysis.analysis.status === 'no_intersections') {
                warningMessage = '🚨 <strong>Schedule Reality Check:</strong> No wake-up windows satisfy both Fajr and work constraints. You need to adjust your bedtime or work schedule.';
                warningType = 'critical';
            } else if (intersectionAnalysis.analysis.status === 'no_viable') {
                warningMessage = '🚨 <strong>Schedule Reality Check:</strong> All Fajr+work intersections create conflicts or insufficient rest. This schedule will cause fatigue.';
                warningType = 'critical';
            } else if (intersectionAnalysis.totalSleepTime < 6) {
                warningMessage = '⚠️ <strong>Insufficient Sleep Warning:</strong> This schedule provides less than 6 hours of sleep. You will feel tired regardless of cycle timing.';
                warningType = 'warning';
            } else if (intersectionAnalysis.analysis.bestOptions === 0) {
                warningMessage = 'ℹ️ <strong>Notice:</strong> No perfect REM completion options available. This is your fault for not sleeping earlier.';
                warningType = 'info';
            }
        }
        // Fallback to old optimization logic
        else if (fajrOptimization && !fajrOptimization.hasViableOption) {
            warningMessage = '🚨 <strong>Schedule Reality Check:</strong> All Fajr options lead to cycle interruption at work time. You will feel groggy regardless of when you wake for Fajr.';
            warningType = 'critical';
        }
        // Check for insufficient sleep time
        else if (fajrOptimization && fajrOptimization.totalSleepTime < 6) {
            warningMessage = '⚠️ <strong>Insufficient Sleep Warning:</strong> Your schedule provides less than 6 hours of sleep. Consider going to bed earlier for better health and alertness.';
            warningType = 'warning';
        }
        // Check for work mode conflicts
        else if (workMode && mustWakeBy) {
            const viableOptions = windows.best.filter(w => w.end <= mustWakeBy).length + 
                                windows.okay.filter(w => w.end <= mustWakeBy).length;
            if (viableOptions === 0) {
                warningMessage = '❌ <strong>Work Schedule Conflict:</strong> No good wake-up windows exist before your work deadline. You may need to adjust your bedtime or work start time.';
                warningType = 'critical';
            }
        }

        if (warningMessage) {
            const warningDiv = document.createElement('div');
            const bgClass = {
                critical: 'bg-red-50 border-red-200 text-red-800',
                warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
                info: 'bg-blue-50 border-blue-200 text-blue-800'
            }[warningType];
            
            warningDiv.className = `${bgClass} border rounded-lg p-4 mb-6`;
            warningDiv.innerHTML = `
                <div class="flex items-start">
                    <div class="flex-shrink-0 mr-3 mt-1">
                        ${warningType === 'critical' ? '🚨' : warningType === 'warning' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div class="text-sm">
                        ${warningMessage}
                        <div class="mt-2 text-xs opacity-80">
                            💡 Consider: Earlier bedtime, staying awake after Fajr, or adjusting work schedule if possible.
                        </div>
                    </div>
                </div>
            `;
            
            timelineDiv.insertBefore(warningDiv, timelineDiv.firstChild);
        }
    }

    displayIntersectionAnalysis(contentDiv, intersections) {
        const { best, okay, bad, analysis } = intersections;
        
        // Status indicator
        const statusColors = {
            optimal: 'text-green-600 bg-green-50',
            acceptable: 'text-yellow-600 bg-yellow-50', 
            no_viable: 'text-red-600 bg-red-50',
            no_intersections: 'text-gray-600 bg-gray-50'
        };
        
        const statusClass = statusColors[analysis.status] || 'text-gray-600 bg-gray-50';
        
        // Get constraint info from the last calculation
        const lastCalc = this.lastCalculation;
        const fajrWindowStr = lastCalc?.fajrWindow ? 
            `${this.formatTime(lastCalc.fajrWindow.start)} - ${this.formatTime(lastCalc.fajrWindow.end)}` : 
            'Not specified';
        const workTimeStr = lastCalc?.workTime ? this.formatTime(lastCalc.workTime) : 'Not specified';

        contentDiv.innerHTML = `
            <!-- Constraint Summary -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <h4 class="font-medium text-blue-800 mb-2">Schedule Constraints</h4>
                <div class="text-sm text-blue-700 space-y-1">
                    <div><strong>Fajr Window:</strong> ${fajrWindowStr}</div>
                    <div><strong>Work Starts At:</strong> ${workTimeStr}</div>
                    <div><strong>Bedtime:</strong> ${lastCalc?.bedtime ? this.formatTime(lastCalc.bedtime) : 'Not specified'}</div>
                </div>
            </div>

            <!-- Status Summary -->
            <div class="${statusClass} p-4 rounded-lg border mb-4">
                <div class="font-medium mb-2">
                    ${analysis.status === 'optimal' ? '🎯 Optimal Fajr+Work Alignment Found!' : 
                      analysis.status === 'acceptable' ? '⚠️ Acceptable Options Available' :
                      analysis.status === 'no_viable' ? '🚨 No Viable Schedule Combination' :
                      '❌ No Schedule Intersections Found'}
                </div>
                <div class="text-sm">${analysis.message}</div>
                ${analysis.totalOptions > 0 ? `
                    <div class="text-xs mt-2 opacity-80">
                        Found ${analysis.totalOptions} intersection${analysis.totalOptions > 1 ? 's' : ''} between Fajr (${fajrWindowStr}) and work (${workTimeStr}), 
                        ${analysis.viableOptions} viable option${analysis.viableOptions !== 1 ? 's' : ''}
                    </div>
                ` : ''}
            </div>

            ${best.length > 0 ? `
                <!-- Best Options (REM Completion) -->
                <div class="mb-4">
                    <h4 class="font-medium text-green-700 mb-3 flex items-center">
                        ✅ <span class="ml-2">Best Options - REM Completion (${best.length})</span>
                    </h4>
                    <div class="space-y-2">
                        ${best.map((pairing, index) => `
                            <div class="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                                <div class="flex items-center justify-between">
                                    <div class="font-medium text-green-800">
                                        ${index === 0 ? '🏆 ' : ''}✅ ${this.formatTime(pairing.fajrStart)}–${this.formatTime(pairing.fajrEnd)} 
                                        <span class="text-sm ml-2">(${pairing.fajrDurationMinutes} min window)</span>
                                    </div>
                                    <div class="text-xs text-green-600 uppercase font-medium">
                                        ${pairing.quality}
                                    </div>
                                </div>
                                <div class="flex items-center mt-1">
                                    <div class="font-medium text-green-800">
                                        ✅ ${this.formatTime(pairing.workTime)} (Work)
                                        <span class="text-sm ml-2">Cycle ${pairing.workCycle}</span>
                                    </div>
                                </div>
                                <div class="text-sm text-green-700 mt-2">
                                    Sleep: ${pairing.sleepDuration.toFixed(1)} hours • 
                                    ${Math.round(pairing.timeUntilWork)} min between Fajr and work
                                    ${pairing.fajrProximity !== undefined ? `• Fajr distance: ${Math.round(pairing.fajrProximity)} min` : ''}
                                    ${pairing.workProximity !== undefined ? `• Work distance: ${Math.round(pairing.workProximity)} min` : ''}
                                </div>
                                ${this.generateProximityWarning(pairing, intersections)}
                                <div class="text-xs text-green-600 mt-1 bg-green-100 p-2 rounded">
                                    <strong>Fajr:</strong> ${pairing.fajrReason}<br>
                                    <strong>Work:</strong> ${pairing.workReason}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${okay.length > 0 ? `
                <!-- Okay Options (Light Sleep) -->
                <div class="mb-4">
                    <h4 class="font-medium text-yellow-700 mb-3 flex items-center">
                        ⚠️ <span class="ml-2">Okay Options - Light Sleep (${okay.length})</span>
                    </h4>
                    <div class="space-y-2">
                        ${okay.map(pairing => `
                            <div class="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                                <div class="flex items-center justify-between">
                                    <div class="font-medium text-yellow-800">
                                        ⚠️ ${this.formatTime(pairing.fajrStart)}–${this.formatTime(pairing.fajrEnd)}
                                        <span class="text-sm ml-2">(${pairing.fajrDurationMinutes} min window)</span>
                                        ${!pairing.viable ? ' <span class="text-red-600 text-xs">(Tight schedule)</span>' : ''}
                                    </div>
                                    <div class="text-xs text-yellow-600 uppercase font-medium">
                                        ${pairing.quality}
                                    </div>
                                </div>
                                <div class="flex items-center mt-1">
                                    <div class="font-medium text-yellow-800">
                                        ⚠️ ${this.formatTime(pairing.workTime)} (Work)
                                        <span class="text-sm ml-2">Cycle ${pairing.workCycle}</span>
                                    </div>
                                </div>
                                <div class="text-sm text-yellow-700 mt-2">
                                    Sleep: ${pairing.sleepDuration.toFixed(1)} hours • 
                                    ${Math.round(pairing.timeUntilWork)} min between Fajr and work
                                    ${pairing.fajrProximity !== undefined ? `• Fajr distance: ${Math.round(pairing.fajrProximity)} min` : ''}
                                    ${pairing.workProximity !== undefined ? `• Work distance: ${Math.round(pairing.workProximity)} min` : ''}
                                </div>
                                ${this.generateProximityWarning(pairing, intersections)}
                                <div class="text-xs text-yellow-600 mt-1 bg-yellow-100 p-2 rounded">
                                    <strong>Fajr:</strong> ${pairing.fajrReason}<br>
                                    <strong>Work:</strong> ${pairing.workReason}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${bad.length > 0 ? `
                <!-- Bad Options (Deep Sleep) -->
                <div class="mb-4">
                    <h4 class="font-medium text-red-700 mb-3 flex items-center">
                        ❌ <span class="ml-2">Avoid These - Deep Sleep (${bad.length})</span>
                    </h4>
                    <div class="space-y-2">
                        ${bad.map(pairing => `
                            <div class="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                                <div class="flex items-center justify-between">
                                    <div class="font-medium text-red-800">
                                        ❌ ${this.formatTime(pairing.fajrStart)}–${this.formatTime(pairing.fajrEnd)}
                                        <span class="text-sm ml-2">(${pairing.fajrDurationMinutes} min window)</span>
                                        <span class="text-xs text-red-600 font-medium ml-2">WILL CAUSE GROGGINESS</span>
                                    </div>
                                    <div class="text-xs text-red-600 uppercase font-medium">
                                        ${pairing.quality}
                                    </div>
                                </div>
                                <div class="flex items-center mt-1">
                                    <div class="font-medium text-red-800">
                                        ❌ ${this.formatTime(pairing.workTime)} (Work)
                                        <span class="text-sm ml-2">Cycle ${pairing.workCycle}</span>
                                    </div>
                                </div>
                                <div class="text-sm text-red-700 mt-2">
                                    Sleep: ${pairing.sleepDuration.toFixed(1)} hours • 
                                    ${Math.round(pairing.timeUntilWork)} min between Fajr and work
                                </div>
                                <div class="text-xs text-red-600 mt-1 bg-red-100 p-2 rounded">
                                    <strong>Problem:</strong> ${pairing.reason}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${this.shouldShowSuggestedAlternatives(intersections) ? `
                <!-- Suggested Coupled Alternatives -->
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <h4 class="font-medium text-purple-800 mb-3 flex items-center">
                        💡 <span class="ml-2">Suggested Coupled Alternatives (Fajr + Work Pairs)</span>
                    </h4>
                    <div class="text-sm text-purple-700 mb-3">
                        Since your current schedule has conflicts, here are the healthiest Fajr+Work coupled pairs:
                    </div>
                    
                    ${intersections.suggestedAlternatives.coupledPairs.length > 0 ? `
                        <div class="space-y-3">
                            ${intersections.suggestedAlternatives.coupledPairs.map((pair, index) => {
                                const pairIcon = pair.classification === 'best' ? '✅' : pair.classification === 'okay' ? '⚠️' : '❌';
                                const pairColor = pair.classification === 'best' ? 'border-green-500 bg-green-50' : 
                                                 pair.classification === 'okay' ? 'border-yellow-500 bg-yellow-50' : 'border-red-500 bg-red-50';
                                const textColor = pair.classification === 'best' ? 'text-green-800' : 
                                                 pair.classification === 'okay' ? 'text-yellow-800' : 'text-red-800';
                                
                                return `
                                    <div class="bg-white border-l-4 ${pairColor} rounded p-3">
                                        <div class="font-medium ${textColor} mb-2">
                                            ${index === 0 ? '🏆 ' : ''}${pairIcon} Coupled Option ${index + 1}
                                            ${pair.classification === 'best' ? ' (EXCELLENT)' : 
                                              pair.classification === 'okay' ? ' (ACCEPTABLE)' : ' (PROBLEMATIC)'}
                                        </div>
                                        
                                        <!-- Fajr Window -->
                                        <div class="mb-2 bg-white border border-purple-200 rounded p-2">
                                            <div class="font-medium text-purple-800 text-sm">
                                                ${pairIcon} Fajr: ${this.formatTime(pair.fajr.start)}–${this.formatTime(pair.fajr.end)}
                                                <span class="text-xs ml-2">(${pair.fajr.durationMinutes} min, Cycle ${pair.fajr.cycle})</span>
                                            </div>
                                            <div class="text-xs text-purple-600 mt-1">
                                                Stage: ${pair.fajr.stage.replace('_', ' ').toUpperCase()} • ${pair.fajr.reason}
                                            </div>
                                        </div>
                                        
                                        <!-- Work Window -->
                                        <div class="mb-2 bg-white border border-purple-200 rounded p-2">
                                            <div class="font-medium text-purple-800 text-sm">
                                                ${pairIcon} Work: ${this.formatTime(pair.work.start)}–${this.formatTime(pair.work.end)}
                                                <span class="text-xs ml-2">(${pair.work.durationMinutes} min, Cycle ${pair.work.cycle})</span>
                                            </div>
                                            <div class="text-xs text-purple-600 mt-1">
                                                Stage: ${pair.work.stage.replace('_', ' ').toUpperCase()} • ${pair.work.reason}
                                            </div>
                                            ${pair.workMisaligned ? `
                                                <div class="text-xs text-orange-600 mt-1 font-medium">
                                                    ⚠️ ${pair.misalignmentWarning}
                                                </div>
                                            ` : ''}
                                        </div>
                                        
                                        <!-- Summary -->
                                        <div class="text-xs ${textColor} bg-white border border-purple-200 rounded p-2">
                                            <strong>Sleep Duration:</strong> ${pair.totalSleepHours.toFixed(1)} hours
                                            ${pair.workMisaligned ? ' • <strong>Work Timing:</strong> Misaligned with cycles' : ' • <strong>Work Timing:</strong> Cycle-aligned'}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : ''}

                    <div class="bg-purple-100 border border-purple-300 rounded p-3 mt-3">
                        <div class="text-sm font-medium text-purple-800 mb-1">⚠️ Reality Check:</div>
                        <div class="text-xs text-purple-700">
                            These coupled pairs show your healthiest Fajr+Work options. 
                            ${intersections.suggestedAlternatives.coupledPairs.some(p => p.workMisaligned) ? 
                              'Work timing is misaligned with healthy cycles.' : 'Work timing aligns reasonably with cycles.'}
                            The root problem is going to bed too late.
                        </div>
                    </div>
                </div>
            ` : ''}

            ${analysis.suggestions && analysis.suggestions.length > 0 ? `
                <!-- Suggestions -->
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 class="font-medium text-gray-800 mb-2">💡 Recommendations:</h4>
                    <ul class="text-sm text-gray-600 space-y-1">
                        ${analysis.suggestions.map(suggestion => `
                            <li class="flex items-start">
                                <span class="mr-2 text-gray-400">•</span>
                                <span>${suggestion}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        `;
    }

    shouldShowSuggestedAlternatives(intersections) {
        // Show alternatives when:
        // 1. No viable pairings exist, OR
        // 2. No best pairings exist (only okay/bad), OR  
        // 3. Very few total options available
        return !intersections.hasViableOptions || 
               intersections.best.length === 0 || 
               (intersections.best.length + intersections.okay.length) < 2;
    }

    displayFajrOptimization(contentDiv, optimization) {
        const { recommendations, scheduleViable, analysis } = optimization;
        
        // Status indicator
        const statusColors = {
            optimal: 'text-green-600 bg-green-50',
            good: 'text-yellow-600 bg-yellow-50',
            acceptable: 'text-orange-600 bg-orange-50',
            acceptable_with_warning: 'text-orange-600 bg-orange-50',
            problematic: 'text-red-600 bg-red-50',
            not_viable: 'text-red-600 bg-red-50',
            no_overlap: 'text-gray-600 bg-gray-50'
        };
        
        const statusClass = statusColors[analysis.status] || 'text-gray-600 bg-gray-50';
        
        contentDiv.innerHTML = `
            <!-- Status Summary -->
            <div class="${statusClass} p-4 rounded-lg border">
                <div class="font-medium mb-2">
                    ${analysis.status === 'optimal' ? '🎯 Optimal Schedule Found!' : 
                      analysis.status === 'good' ? '✅ Good Schedule Available' :
                      analysis.status === 'acceptable' ? '⚠️ Acceptable Schedule' :
                      analysis.status === 'acceptable_with_warning' ? '⚠️ Schedule Has Warnings' :
                      analysis.status === 'problematic' ? '🚨 Problematic Schedule' :
                      analysis.status === 'not_viable' ? '❌ Schedule Not Viable' :
                      '❌ No Optimal Windows Found'}
                </div>
                <div class="text-sm">${analysis.message}</div>
            </div>

            ${recommendations.length > 0 ? `
                <!-- Recommendations -->
                <div>
                    <h4 class="font-medium text-gray-800 mb-3">Recommended Wake Times (within Fajr window):</h4>
                    <div class="space-y-3">
                        ${recommendations.map((rec, index) => {
                            const typeColors = {
                                best: 'border-green-500 bg-green-50',
                                okay: 'border-yellow-500 bg-yellow-50',
                                worst: 'border-red-500 bg-red-50'
                            };
                            
                            const typeIcons = {
                                best: '✅',
                                okay: '⚠️',
                                worst: '❌'
                            };
                            
                            const borderClass = typeColors[rec.sleepType];
                            const icon = typeIcons[rec.sleepType];
                            const priority = index === 0 ? '🏆 RECOMMENDED: ' : `Option ${index + 1}: `;
                            
                            return `
                                <div class="border-l-4 ${borderClass} pl-4 py-3">
                                    <div class="font-medium">
                                        ${priority}${icon} ${this.formatTime(rec.wakeTime)}
                                        ${rec.feasible ? '' : ' ⚠️ <span class="text-red-600 text-sm">(Tight schedule)</span>'}
                                        ${rec.cycleInterruption?.willInterrupt && rec.cycleInterruption.severity === 'high' ? 
                                          ' 🚨 <span class="text-red-600 text-sm font-medium">(WILL CAUSE GROGGINESS)</span>' : ''}
                                    </div>
                                    <div class="text-sm text-gray-600 mt-1">
                                        Sleep quality: ${rec.sleepType} • 
                                        Sleep duration: ${rec.sleepDuration.toFixed(1)} hours • 
                                        Cycle ${rec.cycle}
                                        ${rec.timeUntilWork ? ` • ${Math.round(rec.timeUntilWork)} min until work` : ''}
                                    </div>
                                    <div class="text-xs text-gray-500 mt-1">${rec.reason}</div>
                                    ${rec.postFajrWarning ? `
                                        <div class="mt-2 p-2 rounded text-xs ${
                                            rec.postFajrWarning.type === 'critical' ? 'bg-red-100 text-red-800' :
                                            rec.postFajrWarning.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                            rec.postFajrWarning.type === 'caution' ? 'bg-orange-100 text-orange-800' :
                                            'bg-blue-100 text-blue-800'
                                        }">
                                            <div class="font-medium">${rec.postFajrWarning.icon} Post-Fajr Sleep Impact:</div>
                                            <div class="mt-1">${rec.postFajrWarning.advice}</div>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            ${analysis.suggestions && analysis.suggestions.length > 0 ? `
                <!-- Suggestions -->
                <div>
                    <h4 class="font-medium text-gray-800 mb-2">💡 Suggestions:</h4>
                    <ul class="text-sm text-gray-600 space-y-1">
                        ${analysis.suggestions.map(suggestion => `
                            <li class="flex items-start">
                                <span class="mr-2">•</span>
                                <span>${suggestion}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}

            <!-- Sleep Schedule Viability -->
            <div class="text-xs text-gray-500 pt-2 border-t">
                Total sleep time: ${optimization.totalSleepTime.toFixed(1)} hours
                ${scheduleViable ? ' ✅ Adequate' : ' ⚠️ May be insufficient (recommended: 6+ hours)'}
            </div>
        `;
    }

    createVisualization(cycles, windows, fajr) {
        const visualDiv = document.getElementById('cycleVisualization');
        visualDiv.innerHTML = '';

        const container = document.createElement('div');
        container.className = 'relative bg-gray-100 rounded-lg p-4 overflow-x-auto';

        // Create timeline
        const timeline = document.createElement('div');
        timeline.className = 'flex space-x-1 min-w-max';

        cycles.forEach((cycle, index) => {
            const cycleDiv = document.createElement('div');
            cycleDiv.className = 'relative';
            cycleDiv.style.width = '120px';

            // Create segments for each cycle
            const segments = [
                { type: 'okay', height: '20%', label: 'Light' },
                { type: 'worst', height: '40%', label: 'Deep' },
                { type: 'okay', height: '20%', label: 'Transition' },
                { type: 'best', height: '20%', label: 'REM' }
            ];

            let segmentHTML = `
                <div class="text-xs text-center mb-1 font-medium">Cycle ${index + 1}</div>
                <div class="h-20 border border-gray-300 rounded">
            `;

            segments.forEach(segment => {
                const colorClass = {
                    best: 'bg-sleep-best',
                    okay: 'bg-sleep-okay',
                    worst: 'bg-sleep-worst'
                }[segment.type];

                segmentHTML += `
                    <div class="${colorClass} opacity-75" style="height: ${segment.height}; position: relative;">
                        <div class="text-xs text-white text-center leading-4" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                            ${segment.label}
                        </div>
                    </div>
                `;
            });

            segmentHTML += `</div>`;
            segmentHTML += `<div class="text-xs text-center mt-1">${this.formatTime(cycle.start)}</div>`;

            cycleDiv.innerHTML = segmentHTML;
            timeline.appendChild(cycleDiv);
        });

        container.appendChild(timeline);

        // Add Fajr marker if present
        if (fajr) {
            const fajrMarker = document.createElement('div');
            fajrMarker.className = 'absolute top-0 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium z-10';
            fajrMarker.textContent = `🌅 Fajr ${this.formatTime(fajr)}`;
            fajrMarker.style.left = '10px';
            fajrMarker.style.top = '-30px';
            container.appendChild(fajrMarker);
        }

        visualDiv.appendChild(container);
    }

    findBestWakeTimeForDeadline(windows, deadline) {
        // Find the best wake time before the deadline
        const bestWindows = windows.best.filter(w => w.end <= deadline);
        const okayWindows = windows.okay.filter(w => w.end <= deadline);

        if (bestWindows.length > 0) {
            const lastBest = bestWindows[bestWindows.length - 1];
            return `✅ Best option: Wake up between ${this.formatTime(lastBest.start)} - ${this.formatTime(lastBest.end)} (${lastBest.reason})`;
        } else if (okayWindows.length > 0) {
            const lastOkay = okayWindows[okayWindows.length - 1];
            return `⚠️ Okay option: Wake up between ${this.formatTime(lastOkay.start)} - ${this.formatTime(lastOkay.end)} (${lastOkay.reason})`;
        } else {
            return `❌ No optimal wake times found before ${this.formatTime(deadline)}. Consider adjusting your bedtime.`;
        }
    }

    exportToPDF() {
        if (!this.lastCalculation) {
            alert('Please calculate your sleep schedule first!');
            return;
        }

        // Simple PDF export using browser print
        const printWindow = window.open('', '_blank');
        const content = this.generateExportContent();
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Sleep Schedule</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; margin-bottom: 30px; }
                        .section { margin-bottom: 20px; }
                        .best { color: #10b981; font-weight: bold; }
                        .okay { color: #f59e0b; font-weight: bold; }
                        .worst { color: #ef4444; font-weight: bold; }
                        .window { margin: 5px 0; padding: 8px; border-radius: 4px; }
                        .window.best { background-color: #d1fae5; }
                        .window.okay { background-color: #fef3c7; }
                        .window.worst { background-color: #fee2e2; }
                    </style>
                </head>
                <body>
                    ${content}
                    <script>window.print(); window.close();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    exportToText() {
        if (!this.lastCalculation) {
            alert('Please calculate your sleep schedule first!');
            return;
        }

        const content = this.generateTextExport();
        navigator.clipboard.writeText(content).then(() => {
            alert('Sleep schedule copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = content;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Sleep schedule copied to clipboard!');
        });
    }

    shareURL() {
        if (!this.lastCalculation) {
            alert('Please calculate your sleep schedule first!');
            return;
        }

        const params = new URLSearchParams();
        params.set('bedtime', document.getElementById('bedtime').value);
        if (document.getElementById('fajr').value) {
            params.set('fajr', document.getElementById('fajr').value);
        }
        params.set('cycle', document.getElementById('cycleLength').value);
        if (document.getElementById('workMode').checked) {
            params.set('workMode', 'true');
            params.set('mustWakeBy', document.getElementById('mustWakeBy').value);
        }

        const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('Shareable URL copied to clipboard!');
        }).catch(() => {
            prompt('Copy this URL to share:', url);
        });
    }

    generateExportContent() {
        const calc = this.lastCalculation;
        return `
            <div class="header">
                <h1>Sleep Cycle Schedule</h1>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
                <p>Bedtime: ${this.formatTime(calc.bedtime)}</p>
                ${calc.fajr ? `<p>Fajr: ${this.formatTime(calc.fajr)}</p>` : ''}
                ${calc.workMode && calc.mustWakeBy ? `<p>Must wake by: ${this.formatTime(calc.mustWakeBy)}</p>` : ''}
            </div>

            <div class="section">
                <h2>Best Wake Times ✅</h2>
                ${calc.windows.best.map(w => `
                    <div class="window best">
                        ${this.formatTime(w.start)} - ${this.formatTime(w.end)} (Cycle ${w.cycle})
                    </div>
                `).join('')}
            </div>

            <div class="section">
                <h2>Okay Wake Times ⚠️</h2>
                ${calc.windows.okay.map(w => `
                    <div class="window okay">
                        ${this.formatTime(w.start)} - ${this.formatTime(w.end)} (Cycle ${w.cycle})
                    </div>
                `).join('')}
            </div>

            <div class="section">
                <h2>Avoid These Times ❌</h2>
                ${calc.windows.worst.map(w => `
                    <div class="window worst">
                        ${this.formatTime(w.start)} - ${this.formatTime(w.end)} (Cycle ${w.cycle})
                    </div>
                `).join('')}
            </div>
        `;
    }

    generateTextExport() {
        const calc = this.lastCalculation;
        let text = `SLEEP CYCLE SCHEDULE\n`;
        text += `Generated: ${new Date().toLocaleDateString()}\n`;
        text += `Bedtime: ${this.formatTime(calc.bedtime)}\n`;
        if (calc.fajr) text += `Fajr: ${this.formatTime(calc.fajr)}\n`;
        if (calc.workMode && calc.mustWakeBy) text += `Must wake by: ${this.formatTime(calc.mustWakeBy)}\n`;
        text += `\n`;

        text += `✅ BEST WAKE TIMES (End of cycle - REM sleep):\n`;
        calc.windows.best.forEach(w => {
            text += `   ${this.formatTime(w.start)} - ${this.formatTime(w.end)} (Cycle ${w.cycle})\n`;
        });

        text += `\n⚠️ OKAY WAKE TIMES (Light sleep):\n`;
        calc.windows.okay.forEach(w => {
            text += `   ${this.formatTime(w.start)} - ${this.formatTime(w.end)} (Cycle ${w.cycle})\n`;
        });

        text += `\n❌ AVOID THESE TIMES (Deep sleep):\n`;
        calc.windows.worst.forEach(w => {
            text += `   ${this.formatTime(w.start)} - ${this.formatTime(w.end)} (Cycle ${w.cycle})\n`;
        });

        return text;
    }

    // Load parameters from URL on page load
    loadFromURL() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.get('bedtime')) {
            document.getElementById('bedtime').value = params.get('bedtime');
        }
        if (params.get('fajr')) {
            document.getElementById('fajr').value = params.get('fajr');
        }
        if (params.get('cycle')) {
            document.getElementById('cycleLength').value = params.get('cycle');
            document.getElementById('cycleValue').textContent = params.get('cycle');
        }
        if (params.get('workMode') === 'true') {
            document.getElementById('workMode').checked = true;
            document.getElementById('mustWakeBy').disabled = false;
            if (params.get('mustWakeBy')) {
                document.getElementById('mustWakeBy').value = params.get('mustWakeBy');
            }
        }

        // Auto-calculate if we have parameters
        if (params.get('bedtime')) {
            this.calculateSleepCycles();
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    const app = new SleepCycleCalculator();
    app.loadFromURL();
});


