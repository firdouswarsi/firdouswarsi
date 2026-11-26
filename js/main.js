/**
 * Main Application Logic for Firdous Warsi DevOps Portfolio
 * Manages section navigation, UI state, touch/keyboard events, and gesture bridge.
 */

document.addEventListener("DOMContentLoaded", () => {
  const sections = [
    { id: "sec-home", title: "DevOps City", icon: "🏙️" },
    { id: "sec-about", title: "About Me", icon: "👨‍💻" },
    { id: "sec-skills", title: "Technical Skills", icon: "⚡" },
    { id: "sec-workflow", title: "DevOps Pipeline", icon: "🔄" },
    { id: "sec-experience", title: "Experience", icon: "🏢" },
    { id: "sec-projects", title: "Featured Projects", icon: "✈️" },
    { id: "sec-stats", title: "GitHub Telemetry", icon: "📊" },
    { id: "sec-contact", title: "Connect", icon: "🤝" }
  ];

  let currentIdx = 0;

  // Elements
  const sectionViews = sections.map(s => document.getElementById(s.id));
  const tilesContainer = document.getElementById("tiles");
  const navLinks = document.querySelectorAll(".nav-link");
  const statusEl = document.getElementById("status");
  const camBtn = document.getElementById("camBtn");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const screenTitle = document.getElementById("screen-title");

  // Build Bottom Navigation Tiles
  function buildTiles() {
    if (!tilesContainer) return;
    tilesContainer.innerHTML = sections.map((s, i) => `
      <div class="nav-tile ${i === currentIdx ? 'active' : ''}" data-index="${i}">
        <b>${s.icon}</b>${s.title}
      </div>
    `).join("");

    tilesContainer.querySelectorAll(".nav-tile").forEach(tile => {
      tile.addEventListener("click", () => {
        const idx = parseInt(tile.dataset.index, 10);
        navigateTo(idx);
      });
    });
  }

  // Switch section
  function navigateTo(index) {
    if (index < 0) index = sections.length - 1;
    if (index >= sections.length) index = 0;
    currentIdx = index;

    // Toggle active view
    sectionViews.forEach((sec, i) => {
      if (sec) {
        if (i === currentIdx) {
          sec.classList.add("active");
        } else {
          sec.classList.remove("active");
        }
      }
    });

    // Update bottom tiles
    if (tilesContainer) {
      tilesContainer.querySelectorAll(".nav-tile").forEach((tile, i) => {
        tile.classList.toggle("active", i === currentIdx);
      });
    }

    // Update top header links
    navLinks.forEach((link, i) => {
      link.classList.toggle("active", i === currentIdx);
    });

    // Update HUD topline
    if (screenTitle) {
      screenTitle.textContent = `${sections[currentIdx].icon} ${sections[currentIdx].title.toUpperCase()}`;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function move(direction) {
    navigateTo(currentIdx + direction);
  }

  // Prev / Next Controls
  if (prevBtn) prevBtn.addEventListener("click", () => move(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => move(1));

  // Header Nav Links
  navLinks.forEach((link, idx) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(idx);
    });
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      move(1);
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      move(-1);
    } else if (e.key === "Home") {
      navigateTo(0);
    } else if (e.key === "End") {
      navigateTo(sections.length - 1);
    }
  });

  // Mobile Touch Swipe Handling
  let touchStartX = 0;
  let touchEndX = 0;
  const screenEl = document.querySelector(".holographic-screen");

  if (screenEl) {
    screenEl.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    screenEl.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });
  }

  function handleSwipe() {
    const threshold = 60;
    if (touchEndX < touchStartX - threshold) {
      move(1); // Swipe left -> next
    } else if (touchEndX > touchStartX + threshold) {
      move(-1); // Swipe right -> prev
    }
  }

  // Hand Gesture Tracking Initialization
  const gestures = new window.GestureController({
    onSwipeRight: () => move(1),
    onSwipeLeft: () => move(-1),
    onStatusChange: (code, text) => {
      if (statusEl) {
        statusEl.textContent = text;
        if (code === "ACTIVE") {
          statusEl.style.color = "#10b981";
          statusEl.style.borderColor = "#10b981";
          if (camBtn) {
            camBtn.classList.add("camera-active");
            camBtn.innerHTML = "📷 Disable Camera";
          }
        } else {
          statusEl.style.color = "#9edfff";
          statusEl.style.borderColor = "rgba(22, 124, 255, 0.6)";
          if (camBtn) {
            camBtn.classList.remove("camera-active");
            camBtn.innerHTML = "✋ Enable Camera";
          }
        }
      }
    }
  });

  if (camBtn) {
    camBtn.addEventListener("click", async () => {
      await gestures.toggleTracking();
    });
  }

  // Typewriter Loop on Home Section
  const typingTarget = document.getElementById("typing-subtitle");
  if (typingTarget) {
    const roles = [
      "Specializing in Microsoft Azure Infrastructure",
      "Automating Everything with Terraform IaC",
      "Building Zero-Downtime CI/CD Pipelines",
      "Continuous DevSecOps: SonarQube & Trivy",
      "High-Availability Production Systems"
    ];
    let rIdx = 0, charIdx = 0, isDeleting = false;

    function typeEffect() {
      const currentText = roles[rIdx];
      if (isDeleting) {
        typingTarget.textContent = currentText.substring(0, charIdx - 1);
        charIdx--;
      } else {
        typingTarget.textContent = currentText.substring(0, charIdx + 1);
        charIdx++;
      }

      let speed = isDeleting ? 25 : 55;

      if (!isDeleting && charIdx === currentText.length) {
        speed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIdx === 0) {
        isDeleting = false;
        rIdx = (rIdx + 1) % roles.length;
        speed = 400;
      }

      setTimeout(typeEffect, speed);
    }
    typeEffect();
  }

  // Initialize
  buildTiles();
  navigateTo(0);
});

