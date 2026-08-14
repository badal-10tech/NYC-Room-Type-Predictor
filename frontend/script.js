const API_BASE = window.location.origin;

const form = document.getElementById("predictionForm");
const predictBtn = document.getElementById("predictBtn");
const btnLabel = document.querySelector(".btn-label");
const spinner = document.querySelector(".spinner");

const errorBox = document.getElementById("errorBox");

const emptyState = document.getElementById("emptyState");
const resultContent = document.getElementById("resultContent");

const predictionName = document.getElementById("predictionName");
const predictionScore = document.getElementById("predictionScore");
const probabilityList = document.getElementById("probabilityList");

const apiStatus = document.getElementById("apiStatus");

const example = {
  latitude: 40.7128,
  longitude: -74.006,
  price: 150,
  minimum_nights: 2,
  number_of_reviews: 50,
  reviews_per_month: 2.5,
  calculated_host_listings_count: 3,
  availability_365: 200,
  neighbourhood_group: "Manhattan",
  neighbourhood: "Harlem",
};

// --------------------------------------------------
// Set input value
// --------------------------------------------------

function setValue(id, value) {
  document.getElementById(id).value = value;
}

// --------------------------------------------------
// Load example
// --------------------------------------------------

function loadExample() {
  Object.entries(example).forEach(([key, value]) => {
    setValue(key, value);
  });

  hideError();
}

// --------------------------------------------------
// Reset form
// --------------------------------------------------

function resetForm() {
  form.reset();

  setValue("latitude", 40.7128);
  setValue("longitude", -74.006);
  setValue("price", 150);
  setValue("minimum_nights", 2);
  setValue("number_of_reviews", 50);
  setValue("reviews_per_month", 2.5);
  setValue("calculated_host_listings_count", 3);
  setValue("availability_365", 200);
  setValue("neighbourhood_group", "Manhattan");
  setValue("neighbourhood", "Harlem");

  emptyState.hidden = false;
  resultContent.hidden = true;

  hideError();
}

// --------------------------------------------------
// Hide error
// --------------------------------------------------

function hideError() {
  errorBox.hidden = true;
  errorBox.textContent = "";
}

// --------------------------------------------------
// Show error
// --------------------------------------------------

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

// --------------------------------------------------
// Loading state
// --------------------------------------------------

function setLoading(loading) {
  predictBtn.disabled = loading;

  if (loading) {
    // Hide button text
    btnLabel.style.display = "none";

    // Show spinner
    spinner.style.display = "inline-block";
  } else {
    // Show button text
    btnLabel.style.display = "inline";

    // Hide spinner
    spinner.style.display = "none";
  }
}

// --------------------------------------------------
// Get form data
// --------------------------------------------------

function getPayload() {
  return {
    latitude: Number(document.getElementById("latitude").value),

    longitude: Number(document.getElementById("longitude").value),

    price: Number(document.getElementById("price").value),

    minimum_nights: Number(document.getElementById("minimum_nights").value),

    number_of_reviews: Number(
      document.getElementById("number_of_reviews").value
    ),

    reviews_per_month: Number(
      document.getElementById("reviews_per_month").value
    ),

    calculated_host_listings_count: Number(
      document.getElementById("calculated_host_listings_count").value
    ),

    availability_365: Number(document.getElementById("availability_365").value),

    neighbourhood_group: document
      .getElementById("neighbourhood_group")
      .value.trim(),

    neighbourhood: document.getElementById("neighbourhood").value.trim(),
  };
}

// --------------------------------------------------
// Fetch with timeout
// --------------------------------------------------

async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// --------------------------------------------------
// Check API
// --------------------------------------------------

async function checkApi() {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/api/health`, {}, 5000);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    apiStatus.classList.add("online");
    apiStatus.classList.remove("offline");

    apiStatus.innerHTML = '<span class="status-dot"></span> API online';
  } catch (error) {
    console.error("API health check failed:", error);

    apiStatus.classList.add("offline");
    apiStatus.classList.remove("online");

    apiStatus.innerHTML = '<span class="status-dot"></span> API offline';
  }
}

// --------------------------------------------------
// Render prediction results
// --------------------------------------------------

function renderResults(data) {
  console.log("Prediction response:", data);

  predictionName.textContent = data.prediction;

  const probabilities = [...data.probabilities].sort(
    (a, b) => b.probability - a.probability
  );

  const top = probabilities[0];

  predictionScore.textContent = `${(top.probability * 100).toFixed(1)}%`;

  probabilityList.innerHTML = "";

  probabilities.forEach((item) => {
    const percent = item.probability * 100;

    const row = document.createElement("div");

    row.className = "probability-row";

    row.innerHTML = `
            <div class="probability-meta">
                <span>
                    ${escapeHtml(item.room_type)}
                </span>

                <span>
                    ${percent.toFixed(1)}%
                </span>
            </div>

            <div class="bar">
                <div
                    class="fill"
                    style="width: ${percent}%"
                ></div>
            </div>
        `;

    probabilityList.appendChild(row);
  });

  emptyState.hidden = true;

  resultContent.hidden = false;
}

// --------------------------------------------------
// Escape HTML
// --------------------------------------------------

function escapeHtml(value) {
  const div = document.createElement("div");

  div.textContent = value;

  return div.innerHTML;
}

// --------------------------------------------------
// Form submit
// --------------------------------------------------

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  hideError();

  const payload = getPayload();

  console.log("Sending prediction:", payload);

  // START LOADING
  setLoading(true);

  try {
    const response = await fetchWithTimeout(
      `${API_BASE}/predict`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(payload),
      },
      15000
    );

    console.log("Prediction status:", response.status);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let message = `Server returned ${response.status}`;

      if (data?.detail) {
        if (Array.isArray(data.detail)) {
          message = data.detail.map((error) => error.msg).join(", ");
        } else {
          message = data.detail;
        }
      }

      throw new Error(message);
    }

    // Display result
    renderResults(data);
  } catch (error) {
    console.error("Prediction failed:", error);

    if (error.name === "AbortError") {
      showError("The prediction API took longer than 15 seconds to respond.");
    } else {
      showError(error.message || "Could not connect to the prediction API.");
    }
  } finally {
    /*
     * IMPORTANT:
     * Always stop loading.
     */
    setLoading(false);
  }
});

// --------------------------------------------------
// Buttons
// --------------------------------------------------

document.getElementById("exampleBtn").addEventListener("click", loadExample);

document.getElementById("resetBtn").addEventListener("click", resetForm);

// --------------------------------------------------
// Initial API check
// --------------------------------------------------

checkApi();
