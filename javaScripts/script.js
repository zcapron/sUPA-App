/* Constants */
motorSelectionDefault = "./data/BA-352015x4-560_thrust_efficiency_table.json"

const batteryEnergy = 57.72; // Whr

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
        try {
            motorSelected = document.querySelector('input[name="motors"]:checked').value;
            if (motorSelected == "M1") {
                motorSelection = "./data/BA-3520-560-5s-15x4_thrust_efficiency_table.json";
            } else if (motorSelected == "M2") {
                motorSelection = "./data/BA-3520-560_thrust_efficiency_table.json"
            } else {
                motorSelection = "./data/BA-3520-560-6s-13x15_thrust_efficiency_table.json"
            }
        } catch {
            motorSelection = motorSelectionDefault;
        }
        return [S, lSlopeConstants, dSlopeConstants, dryWeight, payloadWeight, motorSelection]
    } catch (error) {
        console.error("Error in pullFormData:", error);
        window.alert("Error in analysis:" + error.message);
        return null;
    }
}



function pullMotorData(motorSelection) {
    return fetch(motorSelection)
        .then(response => response.json()) // Parse JSON
        .then(data => {
            let parsedData = {};

            Object.keys(data).forEach(airspeed => {
                parsedData[airspeed] = {}; // Store throttle values as keys
                
                Object.keys(data[airspeed]).forEach(throttle => {
                    parsedData[airspeed][throttle] = {
                        thrust: data[airspeed][throttle].thrust,
                        efficiency: data[airspeed][throttle].efficiency,
                        rpm: data[airspeed][throttle].rpm,
                        cT: data[airspeed][throttle].Ct,
                        diameter: data[airspeed][throttle].diameter,
                        current: data[airspeed][throttle].current
                    };
                });
            });

            return parsedData; // Return processed data
        })
        .catch(error => console.error("Error fetching JSON:", error));
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

function caclulateEndurance(clcdRatio, batteryEnergy, rho, planformArea, weight, efficiency) {
    let enduranceCalculated = (batteryEnergy * 2655.25 * (efficiency/100) * clcdRatio * (rho * planformArea)**0.5) / (2**0.5 * weight**(3/2)) / 60; //minutes
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
    if (!formData) {
        console.error("Form data could not be retrieved.");
        return; // Stop execution if form data is invalid
    }
    const [S, lSlopeConstants, dSlopeConstants, dryWeight, payloadWeight, motorSelection] = formData;
    const totalWeight = dryWeight + payloadWeight


    pullMotorData(motorSelection).then(motorData => {

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
            for (let airspeed in motorData) {
                const velocity = airspeed;
                const [dynamicPressure, coefficientLift, AoA, coefficientDrag, dragLb, dragOz, lOverD, cLThreeHalfD] =
                    calculateThrustRequired(velocity, rho, lSlopeConstants, dSlopeConstants, totalWeight, S);
                
                let lowerThrottle = null;
                let upperThrottle = null;
            
                // Sort throttle keys numerically
                let throttleKeys = Object.keys(motorData[airspeed])
                    .map(Number) // Convert to numbers
                    .sort((a, b) => a - b); // Sort ascending
            
                for (let i = 0; i < throttleKeys.length; i++) {
                    let throttle = throttleKeys[i];
                    let thrust = motorData[airspeed][throttle].cT * rho * motorData[airspeed][throttle].rpm**2 * motorData[airspeed][throttle].diameter**4; // equation to relate by air density
                    if (thrust < dragOz) {
                        lowerThrottle = throttle; // Keep updating lower bound
                    } else {
                        upperThrottle = throttle; // First throttle that exceeds dragOz
                        break; // Stop searching once we find the upper bound
                    }
                }

                let maxThrust = motorData[airspeed]["100"].cT * rho * motorData[airspeed]["100"].rpm**2 * motorData[airspeed]["100"].diameter**4; // equation to relate by air density
            
                // Handle edge cases where no bounds were found
                if (lowerThrottle === null) lowerThrottle = throttleKeys[0]; // Lowest available throttle
                if (upperThrottle === null) upperThrottle = throttleKeys[throttleKeys.length - 1]; // Highest available throttle

                // Interpolate Data to get exact throttle setting and efficiency
                throttleSetting = interpolate(dragOz, motorData[airspeed][lowerThrottle].thrust, motorData[airspeed][upperThrottle].thrust, lowerThrottle, upperThrottle);
                efficiencySetting = interpolate(throttleSetting, lowerThrottle, upperThrottle, motorData[airspeed][lowerThrottle].efficiency, motorData[airspeed][upperThrottle].efficiency);
                currentNeeded = interpolate(throttleSetting, lowerThrottle, upperThrottle, motorData[airspeed][lowerThrottle].current, motorData[airspeed][upperThrottle].current);

                // Now calculate endurance
                endurance = caclulateEndurance(cLThreeHalfD, batteryEnergy, rho, S, totalWeight, efficiencySetting);
                if (isNaN(endurance) || endurance < 0) {
                    endurance = 0;
                }

                if (endurance > maxEndurance && AoA < 7){ // lower than estimated stall angle for factor of saftey
                    maxEndurance = endurance;
                    maxEnduranceVelocity = airspeed;
                    maxEnduranceAltitude = altitude;
                } 

                // checking for stall speed 

                if (AoA < 10.5 && airspeed < minCalcVelocity && dragOz < maxThrust) {
                    minCalcVelocity = airspeed;
                    minCalcVelocityAltitude = altitude;
                }

                // checking for max speed
                if (AoA < 10.5 && airspeed > maxCalcVelocity && dragOz < maxThrust) {
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

        console.log("Successfully uploaded results");
        window.location.href = "results.html"
    });
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
