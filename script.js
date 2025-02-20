/*---------MOTOR CONFIGURATION INFORMATION-----------*/
const M3P2B3data = [
    [61.8,61.2,60.7,60.1,59.6,59.0,58.5,57.9,57.4,56.8,56.3,55.7,55.2,54.6,54.1,53.5,53.0,52.4,51.9,51.3,50.8,50.2,49.6,49.2,48.7,48.1,47.5,46.9,46.3,45.6,45.0,44.3,43.7,42.9,42.1,41.3,40.4,39.5,38.5,37.6,36.5,35.3,34.1,32.8,31.5,30.1,28.6,27.2,25.6,24.0,22.4,20.7,19.0,17.2,15.4,13.6,11.7,9.8,7.9,6.0,4.0,2.0,0.1], // thrust (oz)
    [18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.8,18.7,18.7,18.7,18.6,18.5,18.4,18.3,18.3,18.1,18.0,17.8,17.6,17.4,17.1,16.9,16.5,16.2,15.8,15.4,14.9,14.4,13.9,13.4,12.8,12.1,11.5,10.8,10.0,9.3,8.5,7.7,6.8,5.9,5.0,4.1,3.1,2.1,1.1], // battery current (A)
    [0.0,1.8,3.6,5.4,7.1,8.8,10.4,12.1,13.6,15.2,16.7,18.2,19.7,21.1,22.5,23.9,25.2,26.5,27.7,29.0,30.2,31.4,32.5,33.6,34.7,35.8,36.9,37.9,38.9,39.9,40.8,41.8,42.7,43.6,44.5,45.3,46.1,46.9,47.7,48.5,49.2,49.9,50.6,51.2,51.8,52.4,52.9,53.4,53.8,54.2,54.5,54.7,54.9,54.9,54.8,54.4,53.8,52.8,51.1,48.3,43.2,32.7,1.8] // efficiency
]






function getMotorData(motor, velocity) {
    let thrust = 0, current = 0, efficiency = 0;

    if (velocity < 0 || velocity >= motor[0].length) {
        console.warn(`Velocity ${velocity} is out of bounds`);
        return [0, 0, 0]; // Return zero to avoid NaN issues
    }

    try {
        thrust = motor[0][velocity];
        current = motor[1][velocity];
        efficiency = motor[2][velocity] || 0; // Ensure efficiency is never undefined
    } catch (error) {
        console.log("Error fetching motor data:", error);
    }

    return [thrust, current, efficiency];
}

const batteryEnergy = 57.72; // Whr

function caclulateEndurance(clcdRatio, batteryEnergy, rho, planformArea, weight, efficiency) {
    let enduranceCalculated = (batteryEnergy * 2655.25 * (efficiency/100) * clcdRatio * (rho * planformArea)**0.5) / (2**0.5 * weight**(3/2)) / 60; //minutes
    return enduranceCalculated;
}

function calculateAeroBody(velocity, rho, liftCoeffs, dragCoeffs, weight, planformArea) {
    // Calculate the aerodynamic SLF characteristics 
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

    if (dragOz > 75){
        dragOz = 75;
    }

    return [dynamicPressure, coefficientLift, AoA, coefficientDrag, dragLb, dragOz, lOverD, cLThreeHalfD];
}




const airDensitites = [
    0.0023769, // 0 ft
    0.0023423, // 500 ft
    0.0023423, // 1000 ft
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
    0.0018111 // 9000 ft
]

function runAnalysis(event) {
    try {
        event.preventDefault(); // Prevent form submission refresh

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
        // const motorType = document.querySelector('input[name="motors"]:checked').value;
        // const propType = document.querySelector('input[name="props"]:checked').value;

        const totalWeight = dryWeight + payloadWeight;

        // Velocity range
        const minVelocity = 10;
        const maxVelocity = 65;
        const velocityStep = 1;
        const stepCount = maxVelocity - minVelocity + 1;

        // Store results in an object
        let results = {};
        let maxEndurance = 0;
        let maxEnduranceVelocity = 0;
        let maxEnduranceAltitude = 0;
        let maxVals = {};

        // Iterate over altitude levels
        for (let i = 0; i < airDensitites.length; i++) {
            let rho = airDensitites[i];
            let altitude = i * 500; // Assuming altitudes in 500ft increments

            // Initialize velocity-based storage
            let altitudeData = {};

            for (let j = 0; j < stepCount; j++) {
                const velocity = minVelocity + j * velocityStep;
                const [dynamicPressure, coefficientLift, AoA, coefficientDrag, dragLb, dragOz, lOverD, cLThreeHalfD] =
                    calculateAeroBody(velocity, rho, lSlopeConstants, dSlopeConstants, totalWeight, S);

                // Store motor data
                const [thrust, current, efficiency] = getMotorData(M3P2B3data, velocity);

                // Endurance information 
                const endurance = caclulateEndurance(cLThreeHalfD, batteryEnergy, rho, S, totalWeight, efficiency)
                // Store results for this velocity
                if (endurance > maxEndurance){
                    maxEndurance = endurance;
                    maxEnduranceVelocity = velocity;
                    maxEnduranceAltitude = altitude;
                } 

                altitudeData[velocity] = {
                    dynamicPressure,
                    coefficientLift,
                    AoA,
                    coefficientDrag,
                    dragLb,
                    dragOz,
                    lOverD,
                    cLThreeHalfD,
                    thrust,
                    current,
                    efficiency,
                    endurance
                };
            }

            // Store results for this altitude
            results[altitude] = altitudeData;
        }
        maxVals = {maxEndurance, maxEnduranceVelocity, maxEnduranceAltitude}
        // Store results in localStorage
        localStorage.setItem("analysisResults", JSON.stringify(results));
        localStorage.setItem("maxResults", JSON.stringify(maxVals));
        

        // Redirect to results page
        window.location.href = "results.html";
    } catch (error) {
        console.log("Error in analysis:", error);
    }
}

// Attach event listener to the form
document.getElementById("inputForm").addEventListener("submit", runAnalysis);


