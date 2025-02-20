/*---------MOTOR CONFIGURATION INFORMATION-----------*/

M3P2B3data = [
    [], // thrust (oz)
    [18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8, 18.8 ], // battery current (A)
    [], // efficiency
]






function getMotorData(motor) {

}

function getPropData(prop) {

}

function calculateAeroBody(velocity, rho, liftCoeffs, dragCoeffs, weight, planformArea) {
    // Calculate the aerodynamic SLF characteristics 
    const velocityFPS = velocity * 5280 / 3600; // velocity fps

    // calculate q and cl 
    const dynamicPressure = 0.5 * rho * velocityFPS * velocityFPS;  
    const coefficientLift = weight / (dynamicPressure * planformArea);
    const AoA = (coefficientLift - liftCoeffs[1]) / liftCoeffs[0];
    const coefficientDrag = dragCoeffs[0] * AoA**4 + dragCoeffs[1] * AoA**3 + dragCoeffs[2] * AoA**2 + dragCoeffs[3] * AoA + dragCoeffs[4];
    const dragLb = coefficientDrag * dynamicPressure * planformArea;
    const dragOz = dragLb * 16;
    const lOverD = weight / dragLb;
    const cLThreeHalfD = coefficientLift**(3/2) / coefficientDrag

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
        const motorType = document.querySelector('input[name="motors"]:checked').value;
        const propType = document.querySelector('input[name="props"]:checked').value;

        const totalWeight = dryWeight + payloadWeight;

        // Velocity range
        const minVelocity = 10;
        const maxVelocity = 65;
        const velocityStep = 1;
        const stepCount = maxVelocity - minVelocity + 1;

        // Store results in an object
        let results = {};

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

                // Store results for this velocity
                altitudeData[velocity] = {
                    dynamicPressure,
                    coefficientLift,
                    AoA,
                    coefficientDrag,
                    dragLb,
                    dragOz,
                    lOverD,
                    cLThreeHalfD
                };
            }

            // Store results for this altitude
            results[altitude] = altitudeData;
        }

        // Store results in localStorage
        localStorage.setItem("analysisResults", JSON.stringify(results));

        // Redirect to results page
        window.location.href = "results.html";
    } catch (error) {
        console.log("Error in analysis:", error);
    }
}

// Attach event listener to the form
document.getElementById("inputForm").addEventListener("submit", runAnalysis);


