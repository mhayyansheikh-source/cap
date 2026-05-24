// --- 1. Video Splash Screen & Scroll Effects ---
const header = document.getElementById('main-header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// Splash Screen Logic
const splashOverlay = document.getElementById('video-splash-overlay');
const btnEnter = document.getElementById('btn-enter-site');
const splashVideo = document.getElementById('splash-video');
const videoUnmuteBtn = document.getElementById('video-unmute-btn');

function initSplashVideo() {
  if (!splashVideo) return;

  const cachedReg = localStorage.getItem('cap_user_registration');
  const splashSeen = sessionStorage.getItem('cap_splash_seen') === 'true';
  const isRegistered = cachedReg ? JSON.parse(cachedReg).registered : false;

  if (isRegistered || splashSeen) return;

  // Attempt to autoplay with sound
  splashVideo.play()
    .then(() => {
      console.log("[CAP] Video autoplay with sound succeeded!");
      if (videoUnmuteBtn) {
        videoUnmuteBtn.textContent = '🔊';
      }
    })
    .catch(err => {
      console.log("[CAP] Autoplay with sound blocked. Falling back to muted autoplay...", err.message);
      splashVideo.muted = true;
      splashVideo.play().catch(e => console.error("[CAP] Muted autoplay also failed:", e));
      if (videoUnmuteBtn) {
        videoUnmuteBtn.textContent = '🔇';
      }
    });

  // Wire up unmute/mute toggle button
  if (videoUnmuteBtn) {
    videoUnmuteBtn.addEventListener('click', () => {
      if (splashVideo.muted) {
        splashVideo.muted = false;
        videoUnmuteBtn.textContent = '🔊';
      } else {
        splashVideo.muted = true;
        videoUnmuteBtn.textContent = '🔇';
      }
    });
  }
}

function checkSplashState() {
  const cachedReg = localStorage.getItem('cap_user_registration');
  const splashSeen = sessionStorage.getItem('cap_splash_seen') === 'true';
  
  let isRegistered = false;
  if (cachedReg) {
    const data = JSON.parse(cachedReg);
    if (data.registered) isRegistered = true;
  }

  // If already registered or already seen in this session, bypass the splash screen
  if (isRegistered || splashSeen) {
    if (splashOverlay) {
      splashOverlay.style.display = 'none';
      splashOverlay.classList.add('hidden');
    }
    document.body.classList.remove('splash-active');
  } else {
    document.body.classList.add('splash-active');
    initSplashVideo();
  }
}

function dismissSplash() {
  if (!splashOverlay) return;
  splashOverlay.classList.add('hidden');
  document.body.classList.remove('splash-active');
  sessionStorage.setItem('cap_splash_seen', 'true');
  
  // Pause the native video player
  if (splashVideo) {
    splashVideo.pause();
  }
}

function scrollToForm() {
  const regFormSection = document.getElementById('registration-form-section');
  if (regFormSection) {
    regFormSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function scrollToManifesto() {
  const manifestoSection = document.getElementById('manifesto-section');
  if (manifestoSection) {
    manifestoSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// Bind click listeners
document.addEventListener('DOMContentLoaded', () => {
  // Check splash screen state first
  checkSplashState();
  
  // Set up live card sync
  setupLiveCardSync();

  const navCtaBtn = document.getElementById('nav-cta-btn');
  const heroPrimaryCta = document.getElementById('hero-primary-cta');
  const heroSecondaryCta = document.getElementById('hero-secondary-cta');

  if (btnEnter) btnEnter.addEventListener('click', dismissSplash);
  if (navCtaBtn) navCtaBtn.addEventListener('click', scrollToForm);
  
  if (heroPrimaryCta) {
    heroPrimaryCta.addEventListener('click', () => {
      const nameInput = document.getElementById('full-name');
      if (nameInput) {
        nameInput.focus();
        nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }

  if (heroSecondaryCta) heroSecondaryCta.addEventListener('click', scrollToManifesto);

  // Close Bootstrap navbar when navigation links are clicked on mobile/tablet
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link-item');
  const navCollapse = document.getElementById('navbarNav');
  if (navCollapse) {
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        const navbarToggler = document.querySelector('.navbar-toggler');
        // Only trigger hide if hamburger toggler is visible (mobile viewport)
        if (navbarToggler && window.getComputedStyle(navbarToggler).display !== 'none') {
          const bsCollapse = bootstrap.Collapse.getInstance(navCollapse) || new bootstrap.Collapse(navCollapse, { toggle: false });
          bsCollapse.hide();
        }
      });
    });
  }
});

// --- 2. Live Registration Counter — Vercel KV Backed ---
const counterDisplay = document.getElementById('counter-display');
const progressBar = document.getElementById('progress-bar');
const currentPctLabel = document.getElementById('current-pct');
const celebrationBanner = document.getElementById('celebration-banner');
const targetGoal = 10000000; // 1 Crore (10 Million)
const BASELINE_COUNT = 0; // Shown instantly while API loads

// currentCount: starts from baseline immediately (offline-safe), then syncs with DB
let currentCount = BASELINE_COUNT;

// 100K celebration flag (per-device, so it only fires once per browser)
let celebrated = localStorage.getItem('cap_100k_celebrated') === 'true';

// Helper to format numbers with commas
function formatNumberWithCommas(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// --- Founding Member Tiers & Pricing Calculation ---
function getFoundingTier(serial) {
  const num = parseInt(String(serial).replace(/,/g, ''), 10);
  if (num <= 10000) {
    return { name: 'Tier 1', price: 'Free', isFounding: true, desc: 'Free (Tier 1)' };
  } else if (num <= 25000) {
    return { name: 'Tier 2', price: '250 PKR', isFounding: true, desc: '250 PKR (Tier 2)' };
  } else if (num <= 50000) {
    return { name: 'Tier 3', price: '500 PKR', isFounding: true, desc: '500 PKR (Tier 3)' };
  } else if (num <= 75000) {
    return { name: 'Tier 4', price: '750 PKR', isFounding: true, desc: '750 PKR (Tier 4)' };
  } else if (num <= 100000) {
    return { name: 'Tier 5', price: '1000 PKR', isFounding: true, desc: '1,000 PKR (Tier 5)' };
  } else {
    return { name: 'Standard', price: 'Standard', isFounding: false, desc: 'Standard Member' };
  }
}

function getTierMax(tierIndex) {
  if (tierIndex === 1) return 10000;
  if (tierIndex === 2) return 25000;
  if (tierIndex === 3) return 50000;
  if (tierIndex === 4) return 75000;
  if (tierIndex === 5) return 100000;
  return Infinity;
}

function updateActiveTierDisplay() {
  const nextSerial = currentCount + 1;
  const activeTier = getFoundingTier(nextSerial);
  
  // Update left column tracker items
  for (let i = 1; i <= 5; i++) {
    const tierItem = document.getElementById(`tier-item-${i}`);
    if (tierItem) {
      tierItem.classList.remove('active', 'filled');
      if (activeTier.name === `Tier ${i}`) {
        tierItem.classList.add('active');
      } else if (nextSerial > getTierMax(i)) {
        tierItem.classList.add('filled');
      }
    }
  }

  // Update dynamic price/tier label in form
  const formPriceEl = document.getElementById('registration-active-price');
  if (formPriceEl) {
    if (activeTier.isFounding) {
      formPriceEl.textContent = `⚡ Active Pricing Tier: ${activeTier.price} (${activeTier.name}) — Founding Status Guaranteed!`;
      formPriceEl.style.color = 'var(--neon-green)';
      formPriceEl.style.borderColor = 'var(--border-neon)';
      formPriceEl.style.background = 'rgba(0, 255, 102, 0.08)';
    } else {
      formPriceEl.textContent = `📅 Registration Status: Active (First Live Meeting Launched)`;
      formPriceEl.style.color = 'var(--text-gray)';
      formPriceEl.style.borderColor = 'var(--border-glass)';
      formPriceEl.style.background = 'rgba(255, 255, 255, 0.02)';
    }
  }

  // Only update card preview elements if the user is NOT registered yet
  const userRegistration = localStorage.getItem('cap_user_registration');
  const isRegistered = userRegistration ? JSON.parse(userRegistration).registered : false;
  
  if (!isRegistered) {
    const cardTierEl = document.getElementById('card-display-tier');
    const cardStatusEl = document.getElementById('card-display-status');
    const cardBadgeEl = document.getElementById('card-display-badge');
    
    if (cardTierEl) {
      cardTierEl.textContent = activeTier.isFounding ? activeTier.desc : 'Standard';
      if (activeTier.isFounding) {
        cardTierEl.style.color = '#ffd700';
      } else {
        cardTierEl.style.color = 'var(--text-white)';
      }
    }
    
    if (cardBadgeEl && cardStatusEl) {
      if (activeTier.isFounding) {
        cardBadgeEl.textContent = 'FOUNDING MEMBER';
        cardBadgeEl.classList.add('badge-founder');
        cardStatusEl.textContent = 'FOUNDER';
        cardStatusEl.style.color = '#ffd700';
      } else {
        cardBadgeEl.textContent = 'MEMBER';
        cardBadgeEl.classList.remove('badge-founder');
        cardStatusEl.textContent = 'RESILIENT';
        cardStatusEl.style.color = 'var(--neon-green)';
      }
    }
  }

  // Keep founder-card gold theme in sync with current tier
  if (typeof updateFounderCardClass === 'function') {
    updateFounderCardClass();
  }
}

// Render the counter digits into the DOM
function updateCounterDOM() {
  const formattedStr = formatNumberWithCommas(currentCount);
  counterDisplay.innerHTML = ''; // Clear current digits

  for (let char of formattedStr) {
    if (char === ',') {
      const commaNode = document.createElement('span');
      commaNode.className = 'counter-comma';
      commaNode.textContent = ',';
      counterDisplay.appendChild(commaNode);
    } else {
      const digitNode = document.createElement('div');
      digitNode.className = 'counter-digit';
      digitNode.textContent = char;
      counterDisplay.appendChild(digitNode);
    }
  }

  // Sync floating counter
  const floatingCountEl = document.getElementById('floating-reg-count');
  if (floatingCountEl) {
    floatingCountEl.textContent = formattedStr;
  }

  // Update progress bar
  const pct = (currentCount / targetGoal) * 100;
  progressBar.style.width = `${pct}%`;
  currentPctLabel.textContent = `${pct.toFixed(4)}% Complete`;

  // Milestone triggers
  updateMilestoneRoadmap();

  // Update pricing tiers tracker
  updateActiveTierDisplay();
}

function updateMilestoneRoadmap() {
  const milestone100k = document.getElementById('milestone-100k');
  const milestone1m   = document.getElementById('milestone-1m');
  const milestone5m   = document.getElementById('milestone-5m');

  if (currentCount >= 100000) {
    milestone100k.classList.add('unlocked');
    milestone100k.classList.remove('active-milestone');
    milestone1m.classList.add('active-milestone');

    if (!celebrated) {
      triggerMilestoneCelebration();
    } else {
      showCelebrationAndStartCountdown();
    }
  } else {
    milestone100k.classList.remove('unlocked');
    milestone100k.classList.add('active-milestone');
    milestone1m.classList.remove('active-milestone', 'unlocked');
    milestone5m.classList.remove('active-milestone', 'unlocked');
    if (celebrationBanner) {
      celebrationBanner.style.display = 'none';
    }
  }

  if (currentCount >= 1000000) {
    milestone1m.classList.add('unlocked');
    milestone1m.classList.remove('active-milestone');
    milestone5m.classList.add('active-milestone');
  }
}

// ── Fetch real count from Vercel KV via /api/count ──────────────────────────
async function fetchCountFromDB() {
  try {
    const res = await fetch('/api/count', { cache: 'no-store' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    if (typeof data.count === 'number' && data.count > currentCount) {
      currentCount = data.count;
      updateCounterDOM();
    }
  } catch (err) {
    // Silent fallback — keep showing current value, try again on next poll
    console.warn('[CAP] Could not reach counter API:', err.message);
  }
}

// ── Atomically increment count in DB after successful registration ───────────
async function incrementCountInDB() {
  try {
    const res = await fetch('/api/count', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    if (typeof data.count === 'number') {
      currentCount = data.count;
      updateCounterDOM();
    }
  } catch (err) {
    // Fallback: bump locally if DB is unreachable
    console.warn('[CAP] Could not increment counter in DB:', err.message);
    currentCount++;
    updateCounterDOM();
  }
}

// Show baseline immediately (instant paint), then sync with real DB
updateCounterDOM();
fetchCountFromDB();

// Poll every 30 seconds so all open browsers stay in sync as registrations come in
setInterval(fetchCountFromDB, 30000);


// --- 3. Confetti / Particle Canvas System ---
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let animationFrameId = null;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class ConfettiParticle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * -canvas.height;
    this.size = Math.random() * 8 + 6;
    // Green and White flag color distribution
    const colors = [
      '#00662d', // Flag Green
      '#10b981', // Neon Green
      '#ffffff', // Pure White
      '#f3f4f6'  // Off White
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.speedX = Math.random() * 2 - 1;
    this.speedY = Math.random() * 3 + 2;
    this.rotation = Math.random() * 360;
    this.rotationSpeed = Math.random() * 4 - 2;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.rotation += this.rotationSpeed;

    // Reset when off screen
    if (this.y > canvas.height) {
      this.y = Math.random() * -20;
      this.x = Math.random() * canvas.width;
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    ctx.rotate((this.rotation * Math.PI) / 180);
    ctx.fillStyle = this.color;
    
    // Draw rectangles/confetti shapes
    ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  animationFrameId = requestAnimationFrame(animateParticles);
}

function startConfetti() {
  canvas.style.display = 'block';
  particles = [];
  for (let i = 0; i < 150; i++) {
    particles.push(new ConfettiParticle());
  }
  animateParticles();
  
  // Stop after 8 seconds to preserve resources
  setTimeout(() => {
    cancelAnimationFrame(animationFrameId);
    canvas.style.display = 'none';
  }, 8000);
}

// --- 4. Live Meeting Countdown System ---
function triggerMilestoneCelebration() {
  celebrated = true;
  localStorage.setItem('cap_100k_celebrated', 'true');
  
  // Confetti explosion
  startConfetti();
  
  // Initialize meeting target time (48 hours from now) in local storage
  const targetTime = Date.now() + (48 * 60 * 60 * 1000);
  localStorage.setItem('cap_meeting_countdown', targetTime);

  showCelebrationAndStartCountdown();
}

function showCelebrationAndStartCountdown() {
  celebrationBanner.style.display = 'block';
  
  // Show top announcement bar
  const topBar = document.getElementById('top-announcement-bar');
  if (topBar) {
    topBar.style.display = 'block';
    document.body.classList.add('has-announcement');
  }
  
  let targetTime = parseInt(localStorage.getItem('cap_meeting_countdown'));
  if (isNaN(targetTime)) {
    targetTime = Date.now() + (48 * 60 * 60 * 1000);
    localStorage.setItem('cap_meeting_countdown', targetTime);
  }

  updateCountdown(targetTime);
  // Tick every second
  setInterval(() => {
    updateCountdown(targetTime);
  }, 1000);
}

function updateCountdown(targetTime) {
  const now = Date.now();
  let diff = targetTime - now;

  if (diff <= 0) {
    // Loop the countdown for demo purposes if it finishes
    const newTarget = Date.now() + (48 * 60 * 60 * 1000);
    localStorage.setItem('cap_meeting_countdown', newTarget);
    diff = newTarget - now;
  }

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);

  document.getElementById('countdown-days').textContent = days.toString().padStart(2, '0');
  document.getElementById('countdown-hours').textContent = hours.toString().padStart(2, '0');
  document.getElementById('countdown-minutes').textContent = minutes.toString().padStart(2, '0');
  document.getElementById('countdown-seconds').textContent = seconds.toString().padStart(2, '0');

  // Update top announcement bar timer
  const topTimer = document.getElementById('top-announcement-timer');
  if (topTimer) {
    topTimer.textContent = `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }
}


const SKILL_MAP = {
  'software_dev':   'Software Dev',
  'design':         'UI/UX Design',
  'marketing':      'Digital Marketing',
  'video_editing':  'Video Editing',
  'writing':        'Copywriter',
  'ai_prompting':   'AI Engineering',
  'ecommerce':      'E-Commerce',
  'data_analytics': 'Data Science',
  'learning':       'Youth Learner'
};

// ─── Card Reveal Animation ────────────────────────────────────────────────────
// Reveals the card column with a 3D flip-in animation when user starts typing
function updateCardVisibility() {
  const cardColumn = document.querySelector('.registration-card-column');
  if (!cardColumn) return;

  const nameInput = document.getElementById('full-name');
  const citySelect = document.getElementById('city');
  const skillSelect = document.getElementById('digital-skill');

  const hasName  = nameInput  && nameInput.value.trim().length > 0;
  const hasCity  = citySelect && citySelect.value !== '';
  const hasSkill = skillSelect && skillSelect.value !== '';

  const shouldReveal = hasName || hasCity || hasSkill;

  if (shouldReveal) {
    cardColumn.classList.add('revealed');
  }
  // Once revealed, never hide again during session (user already started filling)
}

// ─── Founder Card Class Toggle ────────────────────────────────────────────────
// Applies the cyber-gold founder-card theme when the active tier is a founding tier
function updateFounderCardClass() {
  const memberCard = document.getElementById('member-card');
  if (!memberCard) return;

  const nextSerial = currentCount + 1;
  const tier = getFoundingTier(nextSerial);

  if (tier.isFounding) {
    memberCard.classList.add('founder-card');
  } else {
    memberCard.classList.remove('founder-card');
  }
}

function setupLiveCardSync() {
  const nameInput = document.getElementById('full-name');
  const citySelect = document.getElementById('city');
  const skillSelect = document.getElementById('digital-skill');

  const cardName = document.getElementById('card-display-name');
  const cardCity = document.getElementById('card-display-city');
  const cardSkill = document.getElementById('card-display-skill');

  if (nameInput && cardName) {
    nameInput.addEventListener('input', () => {
      const val = nameInput.value.trim();
      cardName.textContent = val || 'Your Name';
      updateCardVisibility();
    });
  }

  if (citySelect && cardCity) {
    citySelect.addEventListener('change', () => {
      const val = citySelect.value;
      cardCity.textContent = val || 'Your City';
      updateCardVisibility();
    });
  }

  if (skillSelect && cardSkill) {
    skillSelect.addEventListener('change', () => {
      const val = skillSelect.value;
      cardSkill.textContent = SKILL_MAP[val] || 'Your Skill';
      updateCardVisibility();
    });
  }

  // Initial founder-card class update on page load
  updateFounderCardClass();
}


// --- 5. Multi-Step Form Coordinator & Validation ---
const form = document.getElementById('registration-form');
const steps = document.querySelectorAll('.form-step');
const stepNavs = document.querySelectorAll('.form-nav-step');
const formNavLine = document.getElementById('form-nav-line');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnSubmit = document.getElementById('btn-submit');
const successContainer = document.getElementById('success-container');
const submitSpinner = document.getElementById('submit-spinner');

let currentStep = 1;
const totalSteps = steps.length;

let uploadedPhotoBase64 = null;

function updateFormNav() {
  // Update step progress line width
  const pct = ((currentStep - 1) / (totalSteps - 1)) * 100;
  formNavLine.style.width = `${pct}%`;

  // Update step nav classes
  stepNavs.forEach((nav, idx) => {
    if (idx + 1 === currentStep) {
      nav.classList.add('active');
      nav.classList.remove('completed');
    } else if (idx + 1 < currentStep) {
      nav.classList.add('completed');
      nav.classList.remove('active');
    } else {
      nav.classList.remove('active', 'completed');
    }
  });

  // Show correct step contents
  steps.forEach((step, idx) => {
    if (idx + 1 === currentStep) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });

  // Update button visibility
  if (currentStep === 1) {
    btnPrev.disabled = true;
  } else {
    btnPrev.disabled = false;
  }

  if (currentStep === totalSteps) {
    btnNext.style.display = 'none';
    btnSubmit.style.display = 'flex';
  } else {
    btnNext.style.display = 'flex';
    btnSubmit.style.display = 'none';
  }
}

// Validates fields for the current step
function validateStep(step) {
  let isValid = true;

  // ─── Step 1: Name ───────────────────────────────────────────────────────────
  if (step === 1) {
    const nameInput = document.getElementById('full-name');
    const errorName = document.getElementById('error-name');
    if (nameInput.value.trim().length < 3) {
      errorName.style.display = 'block';
      nameInput.classList.add('invalid');
      isValid = false;
    } else {
      errorName.style.display = 'none';
      nameInput.classList.remove('invalid');
    }
  }

  // ─── Step 2: Age + Gender ───────────────────────────────────────────────────
  if (step === 2) {
    const ageInput = document.getElementById('age');
    const ageVal = parseInt(ageInput.value);
    const genderVal = document.getElementById('gender').value;
    const errorAge = document.getElementById('error-age');
    const errorGender = document.getElementById('error-gender');

    if (isNaN(ageVal) || ageVal < 18 || ageVal > 40) {
      errorAge.style.display = 'block';
      ageInput.classList.add('invalid');
      isValid = false;
    } else {
      errorAge.style.display = 'none';
      ageInput.classList.remove('invalid');
    }

    if (!genderVal) {
      errorGender.style.display = 'block';
      document.getElementById('gender').classList.add('invalid');
      isValid = false;
    } else {
      errorGender.style.display = 'none';
      document.getElementById('gender').classList.remove('invalid');
    }
  }

  // ─── Step 3: Email + Phone ──────────────────────────────────────────────────
  if (step === 3) {
    const emailInput = document.getElementById('email');
    const emailVal = emailInput.value.trim();
    const phoneInput = document.getElementById('phone');
    const phoneVal = phoneInput.value.trim();
    const errorEmail = document.getElementById('error-email');
    const errorPhone = document.getElementById('error-phone');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      errorEmail.style.display = 'block';
      emailInput.classList.add('invalid');
      isValid = false;
    } else {
      errorEmail.style.display = 'none';
      emailInput.classList.remove('invalid');
    }

    const phoneRegex = /^(03[0-9]{9})|(\+923[0-9]{9})$/;
    if (!phoneRegex.test(phoneVal.replace(/[-\s]/g, ''))) {
      errorPhone.style.display = 'block';
      phoneInput.classList.add('invalid');
      isValid = false;
    } else {
      errorPhone.style.display = 'none';
      phoneInput.classList.remove('invalid');
    }
  }

  // ─── Step 4: City + Skill ───────────────────────────────────────────────────
  if (step === 4) {
    const cityVal = document.getElementById('city').value;
    const skillSelect = document.getElementById('digital-skill');
    const skillVal = skillSelect.value;
    const errorCity = document.getElementById('error-city');
    const errorSkill = document.getElementById('error-skill');

    if (!cityVal) {
      errorCity.style.display = 'block';
      document.getElementById('city').classList.add('invalid');
      isValid = false;
    } else {
      errorCity.style.display = 'none';
      document.getElementById('city').classList.remove('invalid');
    }

    if (!skillVal) {
      errorSkill.style.display = 'block';
      skillSelect.classList.add('invalid');
      isValid = false;
    } else {
      errorSkill.style.display = 'none';
      skillSelect.classList.remove('invalid');
    }
  }

  // ─── Step 5: Interests + Pledge ─────────────────────────────────────────────
  if (step === 5) {
    const interests = document.querySelectorAll('input[name="interests"]:checked');
    const errorInterests = document.getElementById('error-interests');
    if (interests.length === 0) {
      errorInterests.style.display = 'block';
      isValid = false;
    } else {
      errorInterests.style.display = 'none';
    }

    const pledgeChk = document.getElementById('pledge-chk');
    const errorPledge = document.getElementById('error-pledge');
    if (!pledgeChk.checked) {
      errorPledge.style.display = 'block';
      isValid = false;
    } else {
      errorPledge.style.display = 'none';
    }
  }

  return isValid;
}


btnNext.addEventListener('click', () => {
  if (validateStep(currentStep)) {
    currentStep++;
    updateFormNav();
  }
});

btnPrev.addEventListener('click', () => {
  if (currentStep > 1) {
    currentStep--;
    updateFormNav();
  }
});

// Real-time input error removal helper
form.addEventListener('input', (e) => {
  const targetId = e.target.id;
  
  if (targetId === 'full-name') {
    if (e.target.value.trim().length >= 3) {
      document.getElementById('error-name').style.display = 'none';
      e.target.classList.remove('invalid');
    }
  }
  
  if (targetId === 'age') {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 18 && val <= 40) {
      document.getElementById('error-age').style.display = 'none';
      e.target.classList.remove('invalid');
    }
  }

  if (targetId === 'gender') {
    if (e.target.value) {
      document.getElementById('error-gender').style.display = 'none';
      e.target.classList.remove('invalid');
    }
  }

  if (targetId === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(e.target.value.trim())) {
      document.getElementById('error-email').style.display = 'none';
      e.target.classList.remove('invalid');
    }
  }

  if (targetId === 'phone') {
    const phoneRegex = /^(03[0-9]{9})|(\+923[0-9]{9})$/;
    const normalized = e.target.value.trim().replace(/[-\s]/g, "");
    if (phoneRegex.test(normalized)) {
      document.getElementById('error-phone').style.display = 'none';
      e.target.classList.remove('invalid');
    }
  }

  if (targetId === 'city') {
    if (e.target.value) {
      document.getElementById('error-city').style.display = 'none';
      e.target.classList.remove('invalid');
    }
  }

  if (targetId === 'digital-skill') {
    if (e.target.value) {
      document.getElementById('error-skill').style.display = 'none';
      e.target.classList.remove('invalid');
    }
  }

  if (e.target.name === 'interests') {
    const interests = document.querySelectorAll('input[name="interests"]:checked');
    if (interests.length > 0) {
      document.getElementById('error-interests').style.display = 'none';
    }
  }

  if (targetId === 'pledge-chk') {
    if (e.target.checked) {
      document.getElementById('error-pledge').style.display = 'none';
    }
  }
});

// Form Submission — sends to /api/register (Postgres + KV + Formspree email relay)
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateStep(totalSteps)) return;

  btnSubmit.disabled = true;
  submitSpinner.style.display = 'inline-block';

  // Collect all form values
  const name      = document.getElementById('full-name').value.trim();
  const age       = document.getElementById('age').value;
  const gender    = document.getElementById('gender').value;
  const email     = document.getElementById('email').value.trim();
  const phone     = document.getElementById('phone').value.trim();
  const city      = document.getElementById('city').value;
  const skillVal  = document.getElementById('digital-skill').value;
  const interests = [...document.querySelectorAll('input[name="interests"]:checked')]
                      .map(el => el.value);

  const skillName = SKILL_MAP[skillVal] || 'Member';

  try {
    // --- POST to /api/register → Postgres + KV + Formspree relay ---
    const response = await fetch('/api/register', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, age, gender, email, phone, city, interests, skill: skillVal })
    });

    const result = await response.json();

    if (response.ok && result.ok) {
      // Use the real member ID and serial returned from the database
      const registrationData = {
        name,
        email,   // passed through so captureAndUploadCard can send email AFTER form.reset()
        city,
        skill: skillName,
        idCode: result.memberId,
        serial: formatNumberWithCommas(result.serial),
        serialNum: result.serial,
        profilePhoto: uploadedPhotoBase64 || null,
        registered: true
      };

      // Sync the displayed counter to the real DB value
      if (typeof result.count === 'number') {
        currentCount = result.count;
        updateCounterDOM();
      }

      localStorage.setItem('cap_user_registration', JSON.stringify(registrationData));

      // Clear form and display success UI with real DB card data
      form.reset();

      uploadedPhotoBase64 = null;

      displayRegistrationSuccess(registrationData);
      startConfetti();

    } else if (response.status === 409) {
      // Duplicate email — friendly message
      alert('⚠️ This email is already registered with CAP. Each member can register only once.');
      btnSubmit.disabled = false;
      submitSpinner.style.display = 'none';
    } else {
      alert(result.error || 'Registration failed. Please try again.');
      btnSubmit.disabled = false;
      submitSpinner.style.display = 'none';
    }

  } catch (error) {
    console.error('Registration Error:', error);
    alert('Network error. Please check your internet connection and try again.');
    btnSubmit.disabled = false;
    submitSpinner.style.display = 'none';
  }
});

function generateUniqueMemberID() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let randStr = '';
  for (let i = 0; i < 6; i++) {
    randStr += chars[Math.floor(Math.random() * chars.length)];
  }
  return `CAP-PK-${randStr}`;
}

function displayRegistrationSuccess(data) {
  // Dismiss splash screen just in case
  const splashOverlay = document.getElementById('video-splash-overlay');
  if (splashOverlay) {
    splashOverlay.style.display = 'none';
    splashOverlay.classList.add('hidden');
  }
  document.body.classList.remove('splash-active');
  
  // Ensure registration section is visible
  const regFormSection = document.getElementById('registration-form-section');
  if (regFormSection) regFormSection.style.display = 'block';

  // Transition layout to success view
  const layoutContainer = document.getElementById('registration-layout-container');
  if (layoutContainer) layoutContainer.classList.add('is-success');

  // Always reveal the card column immediately in success state
  const cardColumn = document.querySelector('.registration-card-column');
  if (cardColumn) cardColumn.classList.add('revealed');

  // Change preview badge to official status
  const previewBadge = document.getElementById('card-preview-badge');
  if (previewBadge) {
    previewBadge.innerHTML = '<span class="preview-dot"></span> Official Member Card';
    previewBadge.classList.add('official');
  }

  // Hide form content, navigation and active pricing tier badge
  form.style.display = 'none';
  const formNavSteps = document.getElementById('registration-form-nav');
  if (formNavSteps) formNavSteps.style.display = 'none';
  const formPriceEl = document.getElementById('registration-active-price');
  if (formPriceEl) formPriceEl.style.display = 'none';

  // Fill member card visual fields
  document.getElementById('card-display-name').textContent = data.name;
  document.getElementById('card-display-city').textContent = data.city;
  document.getElementById('card-display-skill').textContent = data.skill || 'Member';
  document.getElementById('card-display-id').textContent = data.idCode;
  document.getElementById('card-display-serial').textContent = `#${data.serial}`;

  // Display uploaded profile photo if available, fallback to default mascot
  const cardPhoto = document.getElementById('card-display-photo');
  if (cardPhoto) {
    if (data.profilePhoto) {
      cardPhoto.src = data.profilePhoto;
    } else {
      cardPhoto.src = 'assets/mascot.png';
    }
  }

  // Update badge, status, and tier based on Founding Member logic (first 100,000 registrations)
  const badgeEl = document.getElementById('card-display-badge');
  const statusEl = document.getElementById('card-display-status');
  const tierEl = document.getElementById('card-display-tier');
  const serialNum = data.serialNum || parseInt(String(data.serial).replace(/,/g, ''), 10);
  
  if (badgeEl && statusEl) {
    if (serialNum <= 100000) {
      badgeEl.textContent = 'FOUNDING MEMBER';
      badgeEl.classList.add('badge-founder');
      statusEl.textContent = 'FOUNDER';
      statusEl.style.color = '#ffd700'; // Gold color matching styling
    } else {
      badgeEl.textContent = 'MEMBER';
      badgeEl.classList.remove('badge-founder');
      statusEl.textContent = 'RESILIENT';
      statusEl.style.color = 'var(--neon-green)'; // Neon green color
    }
  }

  // Update tier element on card
  const activeTier = getFoundingTier(serialNum);
  if (tierEl) {
    tierEl.textContent = activeTier.desc;
    if (activeTier.isFounding) {
      tierEl.style.color = '#ffd700'; // Gold color matching styling
    } else {
      tierEl.style.color = 'var(--text-white)';
    }
  }

  // Show success block
  successContainer.style.display = 'block';

  // Scroll to success container
  successContainer.scrollIntoView({ behavior: 'smooth' });

  // Init 3D card tilt
  init3DCardTilt();

  // ─── Gated Payment & Benefits Flow ──────────────────────────────────────────
  const isFree = activeTier.price.toLowerCase() === 'free';
  const cardActions = document.getElementById('preview-card-actions');
  const freeBenefitsContainer = document.getElementById('free-benefits-container');
  const paymentInfoContainer = document.getElementById('payment-info-container');

  if (isFree) {
    // Free Tier (Tier 1): Reveal download/share actions instantly & auto-download
    if (cardActions) cardActions.style.display = 'flex';
    if (freeBenefitsContainer) freeBenefitsContainer.style.display = 'flex';
    if (paymentInfoContainer) paymentInfoContainer.style.display = 'none';

    // Auto-capture & Auto-download card
    setTimeout(() => captureAndUploadCard(data, true), 600);
  } else {
    // Paid Tiers (Tiers 2-5 & Standard): Hide actions, show bank instructions
    if (cardActions) cardActions.style.display = 'none';
    if (freeBenefitsContainer) freeBenefitsContainer.style.display = 'none';
    
    if (paymentInfoContainer) {
      paymentInfoContainer.style.display = 'block';
      const tierNameEl = document.getElementById('payment-tier-name');
      const tierPriceEl = document.getElementById('payment-tier-price');
      if (tierNameEl) tierNameEl.textContent = activeTier.name;
      if (tierPriceEl) tierPriceEl.textContent = activeTier.price;

      // Handle WhatsApp share receipt button
      const btnShareReceipt = document.getElementById('btn-share-receipt-wa');
      if (btnShareReceipt) {
        // Clone button to strip existing listeners if function is somehow called twice
        const newBtn = btnShareReceipt.cloneNode(true);
        btnShareReceipt.parentNode.replaceChild(newBtn, btnShareReceipt);

        newBtn.addEventListener('click', () => {
          // Construct prefilled WhatsApp message
          const msgText = `Hi, I just registered for the Cockroach Awami Party! 🪳 My Member ID is ${data.idCode} (${data.name}). Here is my payment receipt for the ${activeTier.name} (${activeTier.price}) Founding Member registration.`;
          const waUrl = `https://api.whatsapp.com/send?phone=923379912300&text=${encodeURIComponent(msgText)}`;
          window.open(waUrl, '_blank');

          // Unlock download & share actions
          if (cardActions) cardActions.style.display = 'flex';

          // Show success benefits confirmation in place of payment details
          paymentInfoContainer.innerHTML = `
            <div style="background: rgba(0, 255, 102, 0.08); border: 1px solid var(--border-neon); padding: 1.25rem; border-radius: var(--border-radius-md); font-size: 0.9rem; color: var(--neon-green); text-align: center; box-shadow: 0 0 15px rgba(0, 255, 102, 0.2);">
              <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">🎉</span>
              <strong>✓ Receipt Shared!</strong> Your official membership card actions and <strong>Free Guidance to Online Business Launch</strong> benefits are now fully unlocked.
            </div>
          `;
        });
      }
    }

    // Capture card & save to cloud, but prevent auto-downloading until receipt is shared
    setTimeout(() => captureAndUploadCard(data, false), 600);
  }
}

// ─── Local Notification System ────────────────────────────────────────────────
// Fires a native OS browser notification (no email needed)
async function fireLocalNotification(title, body, cardUrl) {
  if (!('Notification' in window)) return;

  const sendIt = () => {
    const n = new Notification(title, {
      body,
      icon: '/assets/mascot.png',
      badge: '/assets/mascot.png',
      tag: 'cap-card-ready',
      requireInteraction: true       // stays until dismissed
    });
    n.onclick = () => { window.open(cardUrl, '_blank'); n.close(); };
  };

  if (Notification.permission === 'granted') {
    sendIt();
  } else if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') sendIt();
  }
}

// Auto-triggers a PNG download directly to the user's device
function autoDownloadPNG(canvas, memberId) {
  const link = document.createElement('a');
  link.download = `CAP-Member-${memberId}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Card Capture, Blob Upload & Local Notifications ─────────────────────────
async function captureAndUploadCard(data, shouldAutoDownload = true) {
  const cardEl   = document.getElementById('member-card');
  const statusEl = document.getElementById('card-email-status');
  if (!cardEl || !statusEl) return;

  // Show loading state
  statusEl.innerHTML = `
    <div class="card-status-box loading">
      <span class="status-spinner"></span>
      <span style="color:var(--text-gray);font-size:0.9rem;">
        Generating your card image &amp; saving to cloud…
      </span>
    </div>`;

  let canvas;
  try {
    // ── Step 1: Capture card as high-res PNG ──────────────────────────────────
    canvas = await html2canvas(cardEl, {
      backgroundColor: '#081d11',
      scale: 2,
      useCORS: true,
      logging: false,
      removeContainer: true
    });

    // ── Step 2: Auto-download PNG directly to device ──────────────────────────
    if (shouldAutoDownload) {
      autoDownloadPNG(canvas, data.idCode);
    }

    const imageBase64 = canvas.toDataURL('image/png');

    // ── Step 3: Upload to Vercel Blob (for cloud backup & 24h link) ───────────
    const response = await fetch('/api/save-card', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        memberId: data.idCode,
        name:     data.name
      })
    });

    const result = await response.json();

    if (response.ok && result.ok) {
      const downloadDeadline = result.downloadDeadline;

      // ── Step 4: Fire native OS notification ──────────────────────────────────
      fireLocalNotification(
        '🪳 CAP Card Saved!',
        `${data.name} — your card is ready. Tap to open & save the cloud copy before it expires.`,
        result.cardUrl
      );

      // ── Step 5: Show premium in-page status panel with live countdown ─────────
      function renderTimer() {
        const ms = downloadDeadline - Date.now();
        if (ms <= 0) return '⏰ Cloud link expired — your downloaded copy is permanent';
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        return `⏰ Cloud link expires in: ${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
      }

      statusEl.innerHTML = `
        <div class="card-status-box success">
          <div class="card-status-icon">✅</div>
          <div class="card-status-body">
            <p class="card-status-title green">
              ${shouldAutoDownload ? 'Card downloaded &amp; saved to cloud!' : 'Card generated &amp; saved to cloud!'}
            </p>
            <p class="card-status-desc">
              ${shouldAutoDownload 
                ? 'Your ID card PNG was <strong>auto-downloaded</strong> to your device.<br>A cloud backup is also available below for 24 hours.'
                : 'Your ID card cloud backup is ready and available below for 24 hours.'}
            </p>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.6rem;">
              <a href="${result.cardUrl}" target="_blank" rel="noopener noreferrer"
                 class="card-download-link" download="CAP-Member-${data.idCode}.png">
                ☁️ Cloud Copy
              </a>
              <button class="card-download-link" id="btn-redownload"
                      style="border:none;cursor:pointer;">
                ⬇️ Download Card
              </button>
            </div>
            <span class="card-expiry-timer" id="expiry-timer">${renderTimer()}</span>
            <p style="font-size:0.78rem;color:var(--text-gray);margin-top:0.6rem;margin-bottom:0;">
              🗑️ Cloud copy auto-deletes after 48 hours.
            </p>
          </div>
        </div>`;

      // Wire "Download" button
      document.getElementById('btn-redownload')
        ?.addEventListener('click', () => autoDownloadPNG(canvas, data.idCode));

      // Live countdown ticker
      const timerEl = document.getElementById('expiry-timer');
      const tick = setInterval(() => {
        if (!timerEl || Date.now() >= downloadDeadline) {
          clearInterval(tick);
          if (timerEl) timerEl.textContent = '⏰ Cloud link expired — your downloaded copy is permanent.';
          return;
        }
        timerEl.textContent = renderTimer();
      }, 1000);

    } else {
      throw new Error(result.error || 'Blob upload failed');
    }

  } catch (err) {
    console.warn('[CAP] Card capture/upload error:', err.message);

    // Even if blob upload failed, the auto-download already happened — show friendly fallback
    statusEl.innerHTML = `
      <div class="card-status-box ${canvas ? 'success' : 'error'}">
        <div class="card-status-icon">${canvas ? '⬇️' : '⚠️'}</div>
        <div class="card-status-body">
          <p class="card-status-title ${canvas ? 'green' : 'red'}">
            ${canvas ? 'Card downloaded to your device ✅' : 'Could not generate card'}
          </p>
          <p class="card-status-desc">
            ${canvas
              ? 'Your PNG was saved to your Downloads folder. Cloud backup unavailable right now — your device copy is permanent.'
              : 'Your registration is saved. Use the <strong>Download ID Card</strong> button above to save it manually.'}
          </p>
          ${canvas ? `<button class="card-download-link" id="btn-redownload-err"
                              style="border:none;cursor:pointer;">⬇️ Download Again</button>` : ''}
        </div>
      </div>`;

    if (canvas) {
      document.getElementById('btn-redownload-err')
        ?.addEventListener('click', () => autoDownloadPNG(canvas, data.idCode));
    }
  }
}


// Check on load if already registered
const cachedReg = localStorage.getItem('cap_user_registration');
if (cachedReg) {
  const data = JSON.parse(cachedReg);
  if (data.registered) {
    displayRegistrationSuccess(data);
  }
}

// --- 6. Digital Card 3D Tilt Effect ---
function init3DCardTilt() {
  const card = document.getElementById('member-card');
  if (!card) return;

  const wrapper = card.parentElement;

  wrapper.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Convert offsets to degrees tilt (max 15deg)
    const tiltX = (y / (rect.height / 2)) * -15;
    const tiltY = (x / (rect.width / 2)) * 15;

    card.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
  });

  wrapper.addEventListener('mouseleave', () => {
    card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
  });
}


// --- 7. Card Actions (Download / Share) ---
async function downloadMemberCard() {
  const userRegistration = localStorage.getItem('cap_user_registration');
  const idCode = userRegistration ? JSON.parse(userRegistration).idCode : 'XXXXXX';
  
  const cardEl = document.getElementById('member-card');
  if (!cardEl) return;

  const btnDownload = document.getElementById('btn-download-card');
  if (btnDownload) {
    btnDownload.disabled = true;
    btnDownload.textContent = 'Generating...';
  }

  try {
    const canvas = await html2canvas(cardEl, {
      backgroundColor: '#081d11',
      scale: 2,
      useCORS: true,
      logging: false,
      removeContainer: true
    });
    autoDownloadPNG(canvas, idCode);
  } catch (err) {
    console.error('Error generating PNG card:', err);
    alert('Failed to generate PNG. Triggering browser print view as fallback.');
    window.print();
  } finally {
    if (btnDownload) {
      btnDownload.disabled = false;
      btnDownload.textContent = '📥 Download ID Card';
    }
  }
}

function shareOnWhatsApp() {
  const idCode = document.getElementById('card-display-id').textContent;
  const message = `I just joined the Cockroach Awami Party (CAP)! 🪳 Pakistan's ultimate GenZ youth resistance movement. I got my Indestructible Digital Member Card with ID: ${idCode}. Join for free now to reclaim the future: ${window.location.href}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}


// Global Event Registration for card actions
document.addEventListener('DOMContentLoaded', () => {
  // Card actions
  const btnDownload = document.getElementById('btn-download-card');
  const btnShare = document.getElementById('btn-share-whatsapp');

  if (btnDownload) btnDownload.addEventListener('click', downloadMemberCard);
  if (btnShare) btnShare.addEventListener('click', shareOnWhatsApp);
});

// Interactive Navigation Search Handler
function handleNavSearch(event) {
  event.preventDefault();
  const searchInput = document.getElementById('nav-search-input');
  if (!searchInput) return;

  const query = searchInput.value.trim().toLowerCase();
  if (!query) return;

  let targetId = '';
  
  if (query.includes('home') || query.includes('top') || query.includes('hero')) {
    targetId = 'hero-section';
  } else if (query.includes('manifesto') || query.includes('pledge') || query.includes('briefing') || query.includes('video') || query.includes('idea') || query.includes('philosophy')) {
    targetId = 'manifesto-section';
  } else if (query.includes('roadmap') || query.includes('milestone') || query.includes('network') || query.includes('scale')) {
    targetId = 'milestones-section';
  } else if (query.includes('live') || query.includes('meeting') || query.includes('meet') || query.includes('mentorship') || query.includes('guidance') || query.includes('monday') || query.includes('class') || query.includes('google')) {
    targetId = 'live-meeting-portal';
  } else if (query.includes('faq') || query.includes('question') || query.includes('help') || query.includes('support') || query.includes('ans') || query.includes('ask')) {
    targetId = 'faq-section';
  } else if (query.includes('register') || query.includes('join') || query.includes('signup') || query.includes('form') || query.includes('card') || query.includes('free') || query.includes('pay') || query.includes('fee')) {
    targetId = 'registration-form-section';
  } else if (query.includes('facebook') || query.includes('fb') || query.includes('group') || query.includes('social') || query.includes('community')) {
    targetId = 'facebook-section';
  }

  if (targetId) {
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Flash glowing effect to indicate matched target
      targetEl.classList.add('search-match-flash');
      setTimeout(() => {
        targetEl.classList.remove('search-match-flash');
      }, 2500);
      
      // If it's the registration form, focus the input
      if (targetId === 'registration-form-section') {
        const nameInput = document.getElementById('full-name');
        if (nameInput) setTimeout(() => nameInput.focus(), 800);
      }
      
      // Close mobile collapse if open
      const navbarCollapse = document.getElementById('navbarNav');
      if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        const toggleBtn = document.querySelector('.navbar-toggler');
        if (toggleBtn) toggleBtn.click();
      }
      
      // Clear input and blur
      searchInput.value = '';
      searchInput.blur();
    }
  } else {
    // Show a custom visual fallback/tooltip warning next to search input
    const originalPlaceholder = searchInput.placeholder;
    searchInput.value = '';
    searchInput.placeholder = "Try 'FAQ', 'Live', 'Roadmap'...";
    searchInput.classList.add('search-error-flash');
    
    setTimeout(() => {
      searchInput.placeholder = originalPlaceholder;
      searchInput.classList.remove('search-error-flash');
    }, 3000);
  }
}

// Scroll to Roadmap section helper
function scrollToRoadmap() {
  const milestonesSection = document.getElementById('milestones-section');
  if (milestonesSection) {
    milestonesSection.scrollIntoView({ behavior: 'smooth' });
  }
}
