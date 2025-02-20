

document.addEventListener("DOMContentLoaded", function () {
    const toggleButton = document.getElementById("toggleButton");
    const resultsTable = document.getElementById("resultsTable");
    const altitudeSelect = document.getElementById("altitudeSelect");
    let chartInstance1 = null;
    let chartInstance2 = null;

    toggleButton.addEventListener("click", function () {
        if (resultsTable.classList.contains("hidden")) {
            resultsTable.classList.remove("hidden");
            toggleButton.textContent = "Hide Table";
        } else {
            resultsTable.classList.add("hidden");
            toggleButton.textContent = "Show Table";
        }
    });

    function loadResults() {
        const results = JSON.parse(localStorage.getItem("analysisResults")) || {};
        const maxResults = JSON.parse(localStorage.getItem("maxResults")) || {};
        let maxEndurance = maxResults.maxEndurance;
        let maxEnduranceVelocity = maxResults.maxEnduranceVelocity;
        let maxEnduranceAltitude = maxResults.maxEnduranceAltitude;

        document.getElementById("resultLog").innerHTML = "Max endurance is " + maxEndurance.toFixed(0) + " minutes traveling at " + maxEnduranceVelocity.toFixed(0) + " mph at " + maxEnduranceAltitude.toFixed(0) + " ft (msl)."

        altitudeSelect.innerHTML = ""; // Clear previous options

        for (let altitude in results) {
            let option = document.createElement("option");
            option.value = altitude;
            option.textContent = altitude + " ft";
            altitudeSelect.appendChild(option);
        }

        if (altitudeSelect.options.length > 0) {
            updateTable();
            drawChart();
        }
    }

    function updateTable() {
        const results = JSON.parse(localStorage.getItem("analysisResults")) || {};
        const selectedAltitude = altitudeSelect.value;
        const tableBody = document.querySelector("#resultsTable tbody");
        tableBody.innerHTML = ""; // Clear existing rows

        if (results[selectedAltitude]) {
            for (let velocity in results[selectedAltitude]) {
                let row = document.createElement("tr");
                let data = results[selectedAltitude][velocity];

                row.innerHTML = `
                    <td>${velocity}</td>
                    <td>${data.dynamicPressure.toFixed(4)}</td>
                    <td>${data.coefficientLift.toFixed(4)}</td>
                    <td>${data.AoA.toFixed(4)}</td>
                    <td>${data.coefficientDrag.toFixed(4)}</td>
                    <td>${data.dragLb.toFixed(4)}</td>
                    <td>${data.dragOz.toFixed(4)}</td>
                    <td>${data.lOverD.toFixed(4)}</td>
                    <td>${data.endurance.toFixed(2)}</td>
                `;

                tableBody.appendChild(row);
            }
        }
    }

    function drawChart() {
        const results = JSON.parse(localStorage.getItem("analysisResults")) || {};
        const selectedAltitude = altitudeSelect.value;
        if (!selectedAltitude || !results[selectedAltitude]) return;

        const airspeed = [];
        const ldRatio = [];
        const cLThreeHalfD = [];
        const thrustAvailable = [];
        const thrustRequired = [];
        const current = [];

        for (let velocity in results[selectedAltitude]) {
            airspeed.push(parseFloat(velocity));
            ldRatio.push(results[selectedAltitude][velocity].lOverD);
            cLThreeHalfD.push(results[selectedAltitude][velocity].cLThreeHalfD);
            thrustAvailable.push(results[selectedAltitude][velocity].thrust);
            thrustRequired.push(results[selectedAltitude][velocity].dragOz);
        }
        console.log(thrustAvailable);

        const ctx1 = document.getElementById("ldChart").getContext("2d");
        const ctx2 = document.getElementById("TaTrChart").getContext("2d");

        if (chartInstance1) { 
            chartInstance1.destroy(); 
            chartInstance1 = null;
        }// Destroy previous chart instance to prevent duplication
        if (chartInstance2) { 
            chartInstance2.destroy(); 
            chartInstance2 = null;
        }


        chartInstance1 = new Chart(ctx1, {
            type: "line",
            data: {
                labels: airspeed,
                datasets: [{
                    label: "L/D Ratio",
                    data: ldRatio,
                    borderColor: "blue",
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 5,
                    pointBackgroundColor: "blue"
                }, 
                {
                    label: "cL^(3/2)/cD Ratio",
                    data: cLThreeHalfD,
                    borderColor: "green",
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 5,
                    pointBackgroundColor: "green"
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Airspeed (mph)"
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: "L/D Ratio"
                        }
                    }
                }
            }
        });

        chartInstance2 = new Chart(ctx2, {
            type: "line",
            data: {
                labels: airspeed,
                datasets: [{
                    label: "Thrust Available",
                    data: thrustAvailable,
                    borderColor: "blue",
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 5,
                    pointBackgroundColor: "blue"
                }, 
                {
                    label: "Thrust Required",
                    data: thrustRequired,
                    borderColor: "red",
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 5,
                    pointBackgroundColor: "red"
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Airspeed (mph)"
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Thrust (oz)"
                        }
                    }
                }
            }
        });
    }

    altitudeSelect.addEventListener("change", function () {
        updateTable();
        drawChart();
    });

    loadResults();
});
