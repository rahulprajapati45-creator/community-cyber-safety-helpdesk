// ===========================================================
// Community Helpdesk for Cyber Safety — script.js
// ===========================================================

const API_BASE_URL = "/api";

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initSmoothScroll();
  initFaqAccordion();
  initTipTabs();
  initHelpdeskForm();
  initContactForm();
  markActiveNavLink();
  initAdminReply();
});

// ===========================================================
// 1. Mobile Navigation
// ===========================================================

function initMobileNav() {
  const hamburger = document.getElementById("hamburger");
  const navLinks = document.getElementById("navLinks");

  if (!hamburger || !navLinks) return;

  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("active");
    navLinks.classList.toggle("open");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("active");
      navLinks.classList.remove("open");
    });
  });
}

// ===========================================================
// 2. Active Navigation Link
// ===========================================================

function markActiveNavLink() {
  const current =
    window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".nav-links a").forEach((link) => {
    const href = link.getAttribute("href");

    if (href === current) {
      link.classList.add("active");
    }
  });
}

// ===========================================================
// 3. Smooth Scroll
// ===========================================================

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");

      if (!targetId || targetId.length <= 1) return;

      const target = document.querySelector(targetId);

      if (target) {
        e.preventDefault();

        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });
}

// ===========================================================
// 4. FAQ Accordion
// ===========================================================

function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");

  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");

    if (!question) return;

    question.addEventListener("click", () => {
      const isActive = item.classList.contains("active");

      faqItems.forEach((i) => {
        i.classList.remove("active");
      });

      if (!isActive) {
        item.classList.add("active");
      }
    });
  });
}

// ===========================================================
// 5. Safety Tips Tabs
// ===========================================================

function initTipTabs() {
  const tabs = document.querySelectorAll(".tip-tab");
  const categories = document.querySelectorAll(".tip-category");

  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetCategory = tab.dataset.category;

      tabs.forEach((t) => {
        t.classList.remove("active");
      });

      tab.classList.add("active");

      categories.forEach((cat) => {
        cat.classList.toggle(
          "active",
          cat.id === targetCategory
        );
      });
    });
  });
}

// ===========================================================
// Shared Form Validation
// ===========================================================

function showFieldError(formGroup, message) {
  if (!formGroup) return;

  formGroup.classList.add("error");

  const errorEl = formGroup.querySelector(".error-msg");

  if (errorEl) {
    errorEl.textContent = message;
  }
}

function clearFieldError(formGroup) {
  if (!formGroup) return;

  formGroup.classList.remove("error");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ===========================================================
// 6. Helpdesk Form
// ===========================================================

function initHelpdeskForm() {
  const form = document.getElementById("helpdeskForm");

  if (!form) return;

  const successBanner =
    document.getElementById("helpdeskSuccess");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.querySelector("#hName");
    const email = form.querySelector("#hEmail");
    const type = form.querySelector("#hType");
    const description = form.querySelector("#hDescription");

    let valid = true;

    // Name
    if (!name || name.value.trim().length < 2) {
      showFieldError(
        name?.closest(".form-group"),
        "Please enter your full name."
      );
      valid = false;
    } else {
      clearFieldError(name.closest(".form-group"));
    }

    // Email
    if (!email || !isValidEmail(email.value.trim())) {
      showFieldError(
        email?.closest(".form-group"),
        "Please enter a valid email address."
      );
      valid = false;
    } else {
      clearFieldError(email.closest(".form-group"));
    }

    // Problem type
    if (!type || !type.value) {
      showFieldError(
        type?.closest(".form-group"),
        "Please select a problem type."
      );
      valid = false;
    } else {
      clearFieldError(type.closest(".form-group"));
    }

    // Description
    if (!description || description.value.trim().length < 10) {
      showFieldError(
        description?.closest(".form-group"),
        "Please describe your problem in at least 10 characters."
      );
      valid = false;
    } else {
      clearFieldError(description.closest(".form-group"));
    }

    if (!valid) return;

    const userEmail = email.value.trim().toLowerCase();

    const submitBtn =
      form.querySelector('button[type="submit"]');

    const originalText =
      submitBtn ? submitBtn.textContent : "Submit Request";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/helpdesk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: name.value.trim(),
            email: userEmail,
            problemType: type.value,
            description: description.value.trim()
          })
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {

        // Save email for checking admin replies later
        localStorage.setItem(
          "helpdeskEmail",
          userEmail
        );

        // Reset fields except email
        name.value = "";
        type.value = "";
        description.value = "";
        email.value = "";

        if (successBanner) {
          successBanner.classList.add("show");

          successBanner.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });

          setTimeout(() => {
            successBanner.classList.remove("show");
          }, 6000);
        }

        // Check for admin reply
        setTimeout(() => {
          loadAdminReplies();
        }, 500);

      } else {
        alert(
          data.message ||
          "Something went wrong. Please try again."
        );
      }

    } catch (error) {
      console.error(
        "Helpdesk submission error:",
        error
      );

      alert(
        "Could not reach the server. Please make sure the backend is running."
      );

    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
}

// ===========================================================
// 7. Contact Form
// ===========================================================

function initContactForm() {
  const form = document.getElementById("contactForm");

  if (!form) return;

  const successBanner =
    document.getElementById("contactSuccess");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.querySelector("#cName");
    const email = form.querySelector("#cEmail");
    const subject = form.querySelector("#cSubject");
    const message = form.querySelector("#cMessage");

    let valid = true;

    if (!name || name.value.trim().length < 2) {
      showFieldError(
        name?.closest(".form-group"),
        "Please enter your name."
      );
      valid = false;
    } else {
      clearFieldError(name.closest(".form-group"));
    }

    if (!email || !isValidEmail(email.value.trim())) {
      showFieldError(
        email?.closest(".form-group"),
        "Please enter a valid email address."
      );
      valid = false;
    } else {
      clearFieldError(email.closest(".form-group"));
    }

    if (!subject || subject.value.trim().length < 3) {
      showFieldError(
        subject?.closest(".form-group"),
        "Please enter a subject."
      );
      valid = false;
    } else {
      clearFieldError(subject.closest(".form-group"));
    }

    if (!message || message.value.trim().length < 10) {
      showFieldError(
        message?.closest(".form-group"),
        "Message should be at least 10 characters."
      );
      valid = false;
    } else {
      clearFieldError(message.closest(".form-group"));
    }

    if (!valid) return;

    const submitBtn =
      form.querySelector('button[type="submit"]');

    const originalText =
      submitBtn ? submitBtn.textContent : "Send";

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/contact`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: name.value.trim(),
            email: email.value.trim().toLowerCase(),
            subject: subject.value.trim(),
            message: message.value.trim()
          })
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {

        form.reset();

        if (successBanner) {
          successBanner.classList.add("show");

          successBanner.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });

          setTimeout(() => {
            successBanner.classList.remove("show");
          }, 6000);
        }

      } else {
        alert(
          data.message ||
          "Something went wrong. Please try again."
        );
      }

    } catch (error) {
      console.error(
        "Contact submission error:",
        error
      );

      alert(
        "Could not reach the server. Please make sure the backend is running."
      );

    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });
}

// ===========================================================
// 8. LOAD ADMIN REPLY FOR USER
// ===========================================================

async function loadAdminReplies() {

  const emailInput =
    document.getElementById("hEmail");

  const replyBox =
    document.getElementById("adminReplyBox");

  // If we are not on helpdesk page, stop
  if (!emailInput || !replyBox) {
    return;
  }

  const email =
    emailInput.value.trim().toLowerCase();

  if (!email) {
    replyBox.style.display = "none";
    return;
  }

  // Show checking message
  replyBox.style.display = "block";

  replyBox.innerHTML = `
    <strong>🛡️ Admin Reply</strong>
    <hr>
    <p>Checking for admin reply...</p>
  `;

  try {

    const url =
      `${API_BASE_URL}/helpdesk/user/${encodeURIComponent(email)}`;

    console.log("Checking admin reply:", url);

    const response = await fetch(url);

    console.log(
      "Reply API status:",
      response.status
    );

    const result = await response.json();

    console.log(
      "Reply API result:",
      result
    );

    if (!response.ok || !result.success) {

      replyBox.innerHTML = `
        <strong>🛡️ Admin Reply</strong>
        <hr>
        <p>❌ Unable to check your request.</p>
      `;

      return;
    }

    // No request found
    if (
      !result.data ||
      !Array.isArray(result.data) ||
      result.data.length === 0
    ) {

      replyBox.innerHTML = `
        <strong>🛡️ Admin Reply</strong>
        <hr>
        <p>No helpdesk request found for this email.</p>
      `;

      return;
    }

    // Latest request
    const latestRequest =
      result.data[0];

    const status =
      latestRequest.status || "Pending";

    // =====================================================
    // ADMIN REPLY EXISTS
    // =====================================================

    if (
      latestRequest.adminReply &&
      String(latestRequest.adminReply).trim() !== ""
    ) {

      const safeReply =
        escapeHtml(
          latestRequest.adminReply
        );

      const safeStatus =
        escapeHtml(status);

      replyBox.innerHTML = `
        <strong>🛡️ Admin Reply</strong>
        <hr>

        <p style="
          font-size:16px;
          line-height:1.6;
          margin-bottom:15px;
        ">
          ${safeReply}
        </p>

        <p>
          <strong>Status:</strong>
          ${safeStatus}
        </p>
      `;

      replyBox.style.display = "block";

      console.log(
        "Admin reply displayed:",
        latestRequest.adminReply
      );

    } else {

      // ===================================================
      // NO ADMIN REPLY YET
      // ===================================================

      replyBox.innerHTML = `
        <strong>🛡️ Admin Reply</strong>
        <hr>

        <p>⏳ Admin has not replied yet.</p>

        <p>
          <strong>Status:</strong>
          ${escapeHtml(status)}
        </p>
      `;

      replyBox.style.display = "block";
    }

  } catch (error) {

    console.error(
      "Error loading admin reply:",
      error
    );

    replyBox.style.display = "block";

    replyBox.innerHTML = `
      <strong>🛡️ Admin Reply</strong>
      <hr>
      <p>❌ Could not connect to the server.</p>
    `;
  }
}

// ===========================================================
// 9. ADMIN REPLY INITIALIZATION
// ===========================================================

function initAdminReply() {

  const emailInput =
    document.getElementById("hEmail");

  const replyBox =
    document.getElementById("adminReplyBox");

  if (!emailInput || !replyBox) {
    return;
  }

  // Get saved email
  const savedEmail =
    localStorage.getItem("helpdeskEmail");

  // Put saved email into email field
  if (
    savedEmail &&
    !emailInput.value.trim()
  ) {
    emailInput.value = savedEmail;
  }

  // Check when user leaves email field
  emailInput.addEventListener(
    "blur",
    () => {
      loadAdminReplies();
    }
  );

  // Check when email changes
  emailInput.addEventListener(
    "change",
    () => {
      loadAdminReplies();
    }
  );

  // Check automatically if email already exists
  if (emailInput.value.trim()) {
    loadAdminReplies();
  }
}

// ===========================================================
// 10. Escape HTML
// ===========================================================

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
