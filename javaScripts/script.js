/* Constants */
const batteryEnergy = 67.2; // Whr

const airDensities = [
    0.0023769, // 0 ft
    0.0023423, // 500 ft
    0.0023081, // 1000 ft
    0.0022743, // 1500 ft
    0.0022409, // 2000 ft
    0.0022078, // 2500 ft
    0.0021751, // 3000 ft
    0.0021428, // 3500 ft
    0.0021109, // 4000 ft
    0.0020793, // 4500 ft
    0.0020481, // 5000 ft
    0.0020172, // 5500 ft
    0.0019867, // 6000 ft
    0.0019566, // 6500 ft
    0.0019268, // 7000 ft
    0.0018974, // 7500 ft
    0.0018683, // 8000 ft
    0.0018395, // 8500 ft
    0.0018111, // 9000 ft
    0.0017830, // 9500 ft
    0.0017552, // 10000 ft
    0.0017277, // 10500 ft
    0.0017006, // 11000 ft
    0.0016737, // 11500 ft
    0.0016472, // 12000 ft
    0.0016209, // 12500 ft
    0.0015950, // 13000 ft
    0.0015693, // 13500 ft
    0.0015439, // 14000 ft
    0.0015188, // 14500 ft
    0.0014939, // 15000 ft
    0.0014693, // 15500 ft
    0.0014450, // 16000 ft
    0.0014209, // 16500 ft
    0.0013971, // 17000 ft
    0.0013735, // 17500 ft
    0.0013502, // 18000 ft
    0.0013271, // 18500 ft
    0.0013043, // 19000 ft
    0.0012817, // 19500 ft
    0.0012593, // 20000 ft
    0.0012372, // 20500 ft
    0.0012153, // 21000 ft
    0.0011936, // 21500 ft
    0.0011721, // 22000 ft
    0.0011508, // 22500 ft
    0.0011297, // 23000 ft
    0.0011088, // 23500 ft
    0.0010881, // 24000 ft
    0.0010676, // 24500 ft
    0.0010473  // 25000 ft
];





/* DATA GATHERING */
function pullFormData() {
    try {
        // Gather form inputs
        const S = parseFloat(document.getElementById("planformArea").value);
        const lSlopeConstants = [
            parseFloat(document.getElementById("lSlope").value),
            parseFloat(document.getElementById("lIntercept").value)
        ];
        const dSlopeConstants = [
            parseFloat(document.getElementById("dC1").value),
            parseFloat(document.getElementById("dC2").value),
            parseFloat(document.getElementById("dC3").value),
            parseFloat(document.getElementById("dC4").value),
            parseFloat(document.getElementById("dC5").value)
        ];
        const dryWeight = parseFloat(document.getElementById("weight").value);
        const payloadWeight = parseFloat(document.getElementById("pWeight").value);

        // get motor data
        const motorToggle = document.getElementById("uploadToggle").checked;
        let batteryEnergy = NaN;
        let motorNum = 0;
        if (motorToggle) {
            const mAh = parseFloat(document.getElementById("batterymAh").value);
            const cells = parseFloat(document.getElementById("batteryCells").value);
            //batteryEnergy = mAh * cells * 4.2 / 1000; // Wh
            batteryEnergy = mAh / 1000; // Ah

            motorNum = parseInt(document.getElementById("motoNum").value);
        }

        return [S, lSlopeConstants, dSlopeConstants, dryWeight, payloadWeight, motorToggle, batteryEnergy, motorNum];

    } catch (error) {
        console.error("Error in pullFormData:", error);
        window.alert("Error in analysis:" + error.message);
        return null;
    }
}



function pullMotorData() {
    return new Promise((resolve, reject) => {
        const files = document.getElementById("folderInput").files;
        if (!files.length) {
            console.log("No files found");
            reject("No files found");
            return;
        }
        
        console.log(files[0]);
        const airspeedValues = [...Array(66).keys()]; // Airspeed from 0-65 mph
        let lookupTable = {};

        // Initialize empty throttle objects for each airspeed
        airspeedValues.forEach(speed => lookupTable[speed] = {});
        let filesProcessed = 0;

        // Use Promise.all to ensure that all files are processed before resolving
        const filePromises = [...files].map(file => {
            return new Promise((fileResolve, fileReject) => {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const lines = e.target.result.split('\n');
                    let motor = '', battery = '', propeller = '', altitude = 0;
                    let dataStart = 0;

                    // Process metadata from the file
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();
                        if (line.includes('Motor:')) motor = line.split(': ')[1].split(';')[0].trim();
                        if (line.includes('Battery:')) battery = line.split(': ')[1].split(';')[0].trim();
                        if (line.includes('Drive System:')) propeller = line.split(';')[1].split(' ')[1].trim();
                        if (line.includes('ft above Sea Level')) altitude = parseInt(line.split('ft')[0].trim(), 10);
                        if (i >= 12 && line.match(/\d/)) { dataStart = i; break; }
                    }

                    const density = airDensities[altitude] || airDensities[0];
                    let throttle = file.name.split('.')[0];
                    let propDiameter = parseInt(propeller.split('x')[0]);

                    // Process flight data and organize by airspeed and throttle
                    for (let i = dataStart; i < lines.length; i++) {
                        const columns = lines[i].trim().split(/\s+/);
                        if (columns.length < 12 || parseFloat(columns[12]) < 1) break;

                        let [airspeed, thrust, efficiency, rpm, current] = [
                            parseFloat(columns[0]), parseFloat(columns[12]),
                            parseFloat(columns[10]), parseInt(columns[11]),
                            parseFloat(columns[3])
                        ];

                        if (!lookupTable[airspeed]) lookupTable[airspeed] = {};

                        let Ct = rpm !== 0 ? thrust / (propDiameter ** 4 * rpm ** 2 * density) : 0;

                        // Organize by throttle setting for each airspeed
                        if (!lookupTable[airspeed][throttle]) {
                            lookupTable[airspeed][throttle] = {};
                        }

                        lookupTable[airspeed][throttle] = {
                            "thrust": thrust,
                            "efficiency": efficiency,
                            "rpm": rpm,
                            "Ct": Ct,
                            "diameter": propDiameter,
                            "current": current
                        };
                    }

                    filesProcessed++;

                    // If all files are processed, create the final JSON, removing empty airspeeds
                    if (filesProcessed === files.length) {
                        console.log("DEBUGGING - lookupTable before resolving:", lookupTable);
                        // Remove airspeeds with no data
                        Object.keys(lookupTable).forEach(airspeed => {
                            if (Object.keys(lookupTable[airspeed]).length === 0) {
                                delete lookupTable[airspeed];
                            }
                        });
                        // Add a delay to allow inspection in the console
                        setTimeout(() => {
                            resolve(lookupTable); // Resolve the promise with the populated lookup table
                        }, 20000); // Delay for 2 seconds before resolving
                    }
                    fileResolve();
                };

                reader.onerror = function (err) {
                    console.error("Error reading file:", err);
                    fileReject(err);
                };

                reader.readAsText(file); // Read the file as text
            });
        });

        // Wait for all file reading to finish
        Promise.all(filePromises).then(() => {
            // All files processed, now resolve the final lookupTable
            resolve(lookupTable);
        }).catch(err => {
            console.error("Error processing files:", err);
            reject(err);
        });
    });
}


/* DATA PROCCESSING */
function calculateThrustRequired(velocity, rho, liftCoeffs, dragCoeffs, weight, planformArea) {
    // Takes in starCCM data and outputs tabular information for steady level flight
    const velocityFPS = velocity * 5280 / 3600; // velocity fps

    // calculate q and cl 
    const dynamicPressure = 0.5 * rho * velocityFPS * velocityFPS;  
    const coefficientLift = weight / (dynamicPressure * planformArea);
    const AoA = (coefficientLift - liftCoeffs[1]) / liftCoeffs[0];
    const coefficientDrag = dragCoeffs[0] * AoA**4 + dragCoeffs[1] * AoA**3 + dragCoeffs[2] * AoA**2 + dragCoeffs[3] * AoA + dragCoeffs[4];
    let dragLb = coefficientDrag * dynamicPressure * planformArea;
    if (dragLb < 0) {
        dragLb = -dragLb;
    }
    let dragOz = dragLb * 16;
    const lOverD = weight / dragLb;
    const cLThreeHalfD = coefficientLift**(3/2) / coefficientDrag
    // Set max bound to make graphs readable
    // if (dragOz > 200){
    //     dragOz = 200;
    // }

    return [dynamicPressure, coefficientLift, AoA, coefficientDrag, dragLb, dragOz, lOverD, cLThreeHalfD];
}

function caclulateEndurance(batteryEnergy, currentDraw) {
    //let enduranceCalculated = (batteryEnergy * 2655.25 * (efficiency/100) * clcdRatio * (rho * planformArea)**0.5) / (2**0.5 * weight**(3/2)) / 60; //minutes
    let enduranceCalculated = batteryEnergy * 60 / currentDraw; // minutes
    return enduranceCalculated;
}

function interpolate(x,x1,x2, y1,y2) {
    return y1 + (x - x1) * ((y2 - y1) / (x2 - x1));
}


function runAnalysis(event) {
    // Run the analysis from the input parameters
    event.preventDefault(); // Prevent form submission refresh

    // Gather input data
    const formData = pullFormData();
    console.log(formData);
    if (!formData) {
        console.error("Form data could not be retrieved.");
        return; // Stop execution if form data is invalid
    }
    const [S, lSlopeConstants, dSlopeConstants, dryWeight, payloadWeight, motorToggle, batteryEnergy, motorNum] = formData;
    const totalWeight = dryWeight + payloadWeight

    if (motorToggle) {
        pullMotorData().then(lookupTable => {

            // Create object to save information calculated
            let results = {};
            let maxEndurance = 0;
            let maxEnduranceVelocity = 0;
            let maxEnduranceAltitude = 0;
            let maxCalcVelocity = 0;
            let maxCalcVelocityAltitude = 0;
            let minCalcVelocity = 100;
            let minCalcVelocityAltitude = 0;
            let maxVals = {};
            let maxAltitude = 0;

            // Create loop to iterate through altitudes
            for (let i=0; i < airDensities.length; i++) {
                let rho = airDensities[i]
                let altitude = i * 500;

                if (!results[altitude]) {
                    results[altitude] = {};
                }

                let j = 0
                // Find throttle setting for required thrust
                for (let airspeed in lookupTable) {
                    const velocity = airspeed;
                    const [dynamicPressure, coefficientLift, AoA, coefficientDrag, dragLb, dragOz, lOverD, cLThreeHalfD] =
                        calculateThrustRequired(velocity, rho, lSlopeConstants, dSlopeConstants, totalWeight, S);
                    
                    let lowerThrottle = null;
                    let upperThrottle = null;
                
                    // Sort throttle keys numerically
                    let throttleKeys = Object.keys(lookupTable[airspeed])
                        .map(Number) // Convert to numbers
                        .sort((a, b) => a - b); // Sort ascending
                
                    for (let i = 0; i < throttleKeys.length; i++) {
                        let throttle = throttleKeys[i];
                        let thrust = lookupTable[airspeed][throttle].Ct * rho * lookupTable[airspeed][throttle].rpm**2 * lookupTable[airspeed][throttle].diameter**4; // equation to relate by air density
                        thrust = thrust * motorNum;
                        if (thrust < dragOz) {
                            lowerThrottle = throttle; // Keep updating lower bound
                        } else {
                            upperThrottle = throttle; // First throttle that exceeds dragOz
                            break; // Stop searching once we find the upper bound
                        }
                    }

                    let maxThrust = lookupTable[airspeed]["100"].Ct * rho * lookupTable[airspeed]["100"].rpm**2 * lookupTable[airspeed]["100"].diameter**4 * motorNum; // equation to relate by air density
                
                    // Handle edge cases where no bounds were found
                    if (lowerThrottle === null) lowerThrottle = throttleKeys[0]; // Lowest available throttle
                    if (upperThrottle === null) upperThrottle = throttleKeys[throttleKeys.length - 1]; // Highest available throttle

                    // Interpolate Data to get exact throttle setting and efficiency
                    throttleSetting = interpolate(dragOz / motorNum, lookupTable[airspeed][lowerThrottle].thrust, lookupTable[airspeed][upperThrottle].thrust, lowerThrottle, upperThrottle);
                    efficiencySetting = interpolate(throttleSetting, lowerThrottle, upperThrottle, lookupTable[airspeed][lowerThrottle].efficiency, lookupTable[airspeed][upperThrottle].efficiency);
                    currentNeeded = interpolate(throttleSetting, lowerThrottle, upperThrottle, lookupTable[airspeed][lowerThrottle].current, lookupTable[airspeed][upperThrottle].current);
                    currentNeeded = currentNeeded * motorNum;

                    // Now calculate endurance
                    //endurance = caclulateEndurance(cLThreeHalfD, batteryEnergy, rho, S, totalWeight, efficiencySetting);
                    endurance = caclulateEndurance(batteryEnergy, currentNeeded);
                    if (isNaN(endurance) || endurance < 0) {
                        endurance = 0;
                    }

                    if (endurance > maxEndurance && AoA < 7){ // lower than estimated stall angle for factor of saftey
                        maxEndurance = endurance;
                        maxEnduranceVelocity = airspeed;
                        maxEnduranceAltitude = altitude;
                    } 

                    // checking for stall speed 

                    if (AoA < 11 && airspeed < minCalcVelocity && dragOz < maxThrust) {
                        minCalcVelocity = airspeed;
                        minCalcVelocityAltitude = altitude;
                    }

                    // checking for max speed
                    if (AoA < 11 && airspeed > maxCalcVelocity && dragOz < maxThrust) {
                        maxCalcVelocity = airspeed;
                        maxCalcVelocityAltitude = altitude;
                    }

                    // check if thrust is available for setting
                    if (dragOz > maxThrust) {
                        throttleSetting = NaN
                    } else {
                        maxAltitude = altitude
                    }

                    // Ignore first 10 airspeeds
                    if (j < 10) {
                        j++;
                        continue;
                    }

                    // create a results object to send to localstorage
                    results[altitude][airspeed] = {
                        throttle: throttleSetting.toFixed(0),
                        efficiency: efficiencySetting.toFixed(1),
                        dynamicPressure: dynamicPressure.toFixed(2),
                        coefficientLift: coefficientLift.toFixed(2),
                        coefficientDrag: coefficientDrag.toFixed(2),
                        AoA: AoA.toFixed(0),
                        dragOz: dragOz.toFixed(2),
                        lOverD: lOverD.toFixed(2),
                        cLThreeHalfD: cLThreeHalfD.toFixed(2),
                        endurance: endurance.toFixed(0),
                        thrust: maxThrust.toFixed(2),
                        current: currentNeeded.toFixed(2)
                    }
                    console.log(endurance)

                }
                

            }
            // create maxval object to push to localstorage
            maxVals = {
                endurance: {
                    maxEndurance: maxEndurance,
                    maxEnduranceVelocity: maxEnduranceVelocity,
                    maxEnduranceAltitude: maxEnduranceAltitude
                },
                maxSpeed: {
                    maxCalcVelocity: maxCalcVelocity,
                    maxCalcVelocityAltitude: maxCalcVelocityAltitude
                },
                minSpeed: {
                    minCalcVelocity: minCalcVelocity,
                    minCalcVelocityAltitude: minCalcVelocityAltitude
                },
                maxAltitude: maxAltitude
            };
            

            // Store results in localStorage
            localStorage.setItem("analysisResults", JSON.stringify(results));
            localStorage.setItem("maxResults", JSON.stringify(maxVals));
            localStorage.setItem("motorToggle", true);

            console.log("Successfully uploaded results");
            window.location.href = "results.html";
        });
    } else {
        const airspeedValues = [...Array(66).keys()]; // Airspeed from 0-65 mph
        // Create object to save information calculated
        let results = {};
        let minCalcVelocity = 100;
        let minCalcVelocityAltitude = 0;
        let maxVals = {};

        // Create loop to iterate through altitudes
        for (let i=0; i < airDensities.length; i++) {
            let rho = airDensities[i]
            let altitude = i * 500;

            if (!results[altitude]) {
                results[altitude] = {};
            }

            let j = 0
            // Find throttle setting for required thrust
            for (let airspeed in airspeedValues) {
                const velocity = airspeed;

                const [dynamicPressure, coefficientLift, AoA, coefficientDrag, dragLb, dragOz, lOverD, cLThreeHalfD] =
                    calculateThrustRequired(velocity, rho, lSlopeConstants, dSlopeConstants, totalWeight, S);

                // checking for stall speed 

                if (AoA < 10.5 && airspeed < minCalcVelocity) {
                    minCalcVelocity = airspeed;
                    minCalcVelocityAltitude = altitude;
                }


                // Ignore first 10 airspeeds
                if (j < 10) {
                    j++;
                    continue;
                }

                // create a results object to send to localstorage
                results[altitude][airspeed] = {
                    dynamicPressure: dynamicPressure.toFixed(2),
                    coefficientLift: coefficientLift.toFixed(2),
                    coefficientDrag: coefficientDrag.toFixed(2),
                    AoA: AoA.toFixed(0),
                    dragOz: dragOz.toFixed(2),
                    lOverD: lOverD.toFixed(2),
                    cLThreeHalfD: cLThreeHalfD.toFixed(2),
                }

            }
            

        }
        // create maxval object to push to localstorage
        maxVals = {
            minSpeed: {
                minCalcVelocity: minCalcVelocity,
                minCalcVelocityAltitude: minCalcVelocityAltitude
            }
        };


        // Store results in localStorage
        localStorage.setItem("analysisResultsNoThrust", JSON.stringify(results));
        localStorage.setItem("maxResults", JSON.stringify(maxVals));
        localStorage.setItem("motorToggle", false);

        console.log("Successfully uploaded results");
        window.location.href = "results.html";
    }
}

document.getElementById("inputForm").addEventListener("submit", runAnalysis);


document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("inputForm");

    form.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault(); // Prevent form submission
            
            // Get all input fields in the form
            const inputs = Array.from(form.querySelectorAll("input[type='text']"));
            
            // Find the current active input field
            const currentIndex = inputs.indexOf(document.activeElement);

            if (currentIndex > -1 && currentIndex < inputs.length - 1) {
                // Move focus to the next input field
                inputs[currentIndex + 1].focus();
            }
        }
    });
});
