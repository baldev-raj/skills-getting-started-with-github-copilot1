document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function escapeHtml(str = "") {
    return String(str).replace(
      /[&<>"']/g,
      (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
    );
  }

  function showMessage(text, type) {
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 4500);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!email || !activity) {
      return showMessage("Please enter your email and select an activity.", "error");
    }

    showMessage("Signing up...", "info");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || result.message || "Signup failed");

      showMessage(result.message || "Signed up successfully!", "success");

      // Update UI: find matching card, add participant, update count and capacity
      const cards = document.querySelectorAll(".activity-card");
      cards.forEach((card) => {
        const h4 = card.querySelector("h4");
        if (h4 && h4.textContent === activity) {
          const ul = card.querySelector(".participants-list");
          if (ul) {
            const existingNo = ul.querySelector(".no-participants");
            if (existingNo) existingNo.remove();
            const li = document.createElement("li");
            li.textContent = email;
            ul.appendChild(li);

            // Update participants count heading
            const heading = card.querySelector(".participants-section h5");
            if (heading) {
              heading.textContent = `Participants (${ul.querySelectorAll("li").length})`;
            }

            // Update capacity display (attempt to parse and increment)
            const pTags = Array.from(card.querySelectorAll("p"));
            pTags.forEach((p) => {
              if (p.textContent && p.textContent.trim().startsWith("Capacity:")) {
                const match = p.textContent.match(/(\d+)\s*\/\s*(\d+)/);
                if (match) {
                  const current = parseInt(match[1], 10) + 1;
                  const max = match[2];
                  p.innerHTML = `<strong>Capacity:</strong> ${current}/${max}`;
                }
              }
            });
          }
        }
      });
    } catch (error) {
      showMessage(error.message || "Signup failed", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
