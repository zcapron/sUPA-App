/* Constants */
motorSelectionDefault = "./data/BA-3520-560_thrust_efficiency_table.json"

const batteryEnergy = 57.72; // Whr

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
        motorSelection = motorSelectionDefault;
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
                        efficiency: data[airspeed][throttle].efficiency
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
    if (dragOz > 75){
        dragOz = 75;
    }

    return [dynamicPressure, coefficientLift, AoA, coefficientDrag, dragLb, dragOz, lOverD, cLThreeHalfD];
}

function caclulateEndurance(clcdRatio, batteryEnergy, rho, planformArea, weight, efficiency) {
    let enduranceCalculated = (batteryEnergy * 2655.25 * (efficiency/100) * clcdRatio * (rho * planformArea)**0.5) / (2**0.5 * weight**(3/2)) / 60; //minutes
    return enduranceCalculated;
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
    const motorData = pullMotorData(motorSelection);

    
    // Initalize Velocity Arrary
    const velocityLowerBound = 10;
    const velocityUpperBound = 65;
    const velocityStep = 1;
    const stepCount = velocityUpperBound - velocityLowerBound + 1;

    // Create loop to iterate through altitudes
    for (let i=0; i < airDensitites.length; i++) {
        let rho = airDensitites[i]

        // Initalize velocity-based storage
        let altitudeData = {};
        for (let j=0; j < stepCount; j++) {
            const velocity = velocityLowerBound + j * velocityStep;
            const [dynamicPressure, coefficientLift, AoA, coefficientDrag, dragLb, dragOz, lOverD, cLThreeHalfD] =
            calculateThrustRequired(velocity, rho, lSlopeConstants, dSlopeConstants, totalWeight, S);
            
            // Iterate through throttle settings at this velocity and store data
            for (let k=0; k < motorData.velocity.length; k++) {
                console.log("a");
            }
        }
    }


}

document.getElementById("inputForm").addEventListener("submit", runAnalysis);


/* DATA POSTING */ 
