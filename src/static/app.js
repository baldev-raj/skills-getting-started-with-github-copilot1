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
          <div class="participants-section">
            <h5>Participants (${details.participants.length})</h5>
            <ul class="participants-list">
              ${details.participants.length === 0 ? '<li class="no-participants">No participants yet</li>' : ''}
            </ul>
          </div>
        `;

        // store max participants on the card for later updates
        activityCard.dataset.maxParticipants = details.max_participants;

        activitiesList.appendChild(activityCard);

        // populate participant items immediately (avoids needing a second fetch)
        const ul = activityCard.querySelector('.participants-list');
        if (ul) {
          // remove helper if participants exist
          const helper = ul.querySelector('.no-participants');
          if (helper) helper.remove();
          details.participants.forEach((email) => {
            const li = createParticipantItem(email, name);
            ul.appendChild(li);
          });
          // if there were no participants and none added, keep helper
          if (details.participants.length === 0) {
            // nothing to do, helper already present
          }
        }

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

  // Helper to create participant list items with delete button
  function createParticipantItem(email, activityName) {
    const li = document.createElement('li');
    li.className = 'participant-item';

    const span = document.createElement('span');
    span.className = 'participant-email';
    span.textContent = email;

    const btn = document.createElement('button');
    btn.className = 'participant-remove';
    btn.setAttribute('aria-label', `Remove ${email} from ${activityName}`);
    btn.title = 'Unregister';
    btn.innerHTML = '&times;';

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      // Call backend to unregister
      try {
        const res = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, {
          method: 'POST'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.message || 'Failed to unregister');

        // Remove from DOM
        const ul = btn.closest('ul');
        li.remove();

        // Update participants count heading
        const participantsSection = ul.closest('.participants-section');
        if (participantsSection) {
          const heading = participantsSection.querySelector('h5');
          const count = ul.querySelectorAll('li').length;
          heading.textContent = `Participants (${count})`;
          if (count === 0) {
            const helper = document.createElement('li');
            helper.className = 'no-participants';
            helper.textContent = 'No participants yet';
            ul.appendChild(helper);
          }
        }

        // Update availability text in card
        const card = document.querySelectorAll('.activity-card');
        card.forEach((c) => {
          const h4 = c.querySelector('h4');
          if (h4 && h4.textContent === activityName) {
            const pTags = Array.from(c.querySelectorAll('p'));
            pTags.forEach((p) => {
              if (p.textContent && p.textContent.trim().startsWith('Availability:')) {
                // compute new availability
                // count participant items that are actual participants (ignore helper)
                const currentParticipants = c.querySelectorAll('.participants-list li').length;
                const max = parseInt(c.dataset.maxParticipants || '0', 10);
                const spotsLeft = max - currentParticipants;
                p.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
              }
            });
          }
        });

      } catch (err) {
        showMessage(err.message || 'Unregister failed', 'error');
        console.error('Error unregistering:', err);
      }
    });

    li.appendChild(span);
    li.appendChild(btn);
    return li;
  }

  function detailsForCardMax(card) {
    // prefer dataset value, fallback to parsing
    if (card.dataset && card.dataset.maxParticipants) {
      return parseInt(card.dataset.maxParticipants, 10) || 0;
    }
    const pTags = Array.from(card.querySelectorAll('p'));
    for (const p of pTags) {
      const text = p.textContent || '';
      const m = text.match(/Capacity:\s*(\d+)\/(\d+)/);
      if (m) {
        return parseInt(m[2], 10);
      }
    }
    return 0;
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

      // Update UI: find matching card, add participant, update count and availability
      const cards = document.querySelectorAll(".activity-card");
      cards.forEach((card) => {
        const h4 = card.querySelector("h4");
        if (h4 && h4.textContent === activity) {
          const ul = card.querySelector('.participants-list');
          if (ul) {
            const existingNo = ul.querySelector('.no-participants');
            if (existingNo) existingNo.remove();
            const li = createParticipantItem(email, activity);
            ul.appendChild(li);

            // Update participants count heading
            const heading = card.querySelector('.participants-section h5');
            if (heading) {
              heading.textContent = `Participants (${ul.querySelectorAll('li').length})`;
            }

            // Update availability display
            const pTags = Array.from(card.querySelectorAll('p'));
            pTags.forEach((p) => {
              if (p.textContent && p.textContent.trim().startsWith('Availability:')) {
                const max = parseInt(card.dataset.maxParticipants || '0', 10);
                const spotsLeft = max - ul.querySelectorAll('li').length;
                p.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;
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
  async function init() {
    // clear any existing activity options except the placeholder
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    await fetchActivities();
  }

  init();
});
