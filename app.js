// --- 1. Navigation, Video & Scroll Effects ---
const header = document.getElementById('main-header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// Transition from video to registration form
function proceedToRegistration() {
  const videoSection = document.getElementById('video-manifesto-section');
  const regFormSection = document.getElementById('registration-form-section');
  if (!videoSection || !regFormSection) return;

  videoSection.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
  regFormSection.style.transition = 'opacity 0.4s ease, transform 0.4s ease';

  videoSection.style.opacity = '0';
  videoSection.style.transform = 'translateY(-10px)';

  setTimeout(() => {
    videoSection.style.display = 'none';
    regFormSection.style.display = 'block';
    regFormSection.style.opacity = '0';
    regFormSection.style.transform = 'translateY(10px)';

    // Trigger reflow
    regFormSection.offsetHeight;

    regFormSection.style.opacity = '1';
    regFormSection.style.transform = 'translateY(0)';
  }, 400);
}

function scrollToForm() {
  const videoSection = document.getElementById('video-manifesto-section');
  const regFormSection = document.getElementById('registration-form-section');

  if (videoSection && videoSection.style.display !== 'none') {
    proceedToRegistration();
    setTimeout(() => {
      if (regFormSection) regFormSection.scrollIntoView({ behavior: 'smooth' });
    }, 450);
  } else if (regFormSection) {
    regFormSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function scrollToManifesto() {
  const manifestoSection = document.getElementById('manifesto-section');
  if (manifestoSection) manifestoSection.scrollIntoView({ behavior: 'smooth' });
}

// Bind navigation click listeners
document.addEventListener('DOMContentLoaded', () => {
  const navCtaBtn = document.getElementById('nav-cta-btn');
  const heroPrimaryCta = document.getElementById('hero-primary-cta');
  const heroSecondaryCta = document.getElementById('hero-secondary-cta');
  const btnProceed = document.getElementById('btn-proceed-to-register');

  if (navCtaBtn) navCtaBtn.addEventListener('click', scrollToForm);
  
  if (heroPrimaryCta) {
    heroPrimaryCta.addEventListener('click', () => {
      const videoSection = document.getElementById('video-manifesto-section');
      if (videoSection && videoSection.style.display !== 'none') {
        proceedToRegistration();
        setTimeout(() => {
          const nameInput = document.getElementById('full-name');
          if (nameInput) {
            nameInput.focus();
            nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 450);
      } else {
        const nameInput = document.getElementById('full-name');
        if (nameInput) {
          nameInput.focus();
          nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }

  if (heroSecondaryCta) heroSecondaryCta.addEventListener('click', scrollToManifesto);
  if (btnProceed) btnProceed.addEventListener('click', proceedToRegistration);
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

// --- Profile Photo Upload Logic ---
const fileInput = document.getElementById('profile-photo');
const fileTrigger = document.getElementById('file-upload-trigger');
const previewContainer = document.getElementById('photo-preview-container');
const photoPreview = document.getElementById('photo-preview');
const btnRemovePhoto = document.getElementById('btn-remove-photo');
const uploadStatusText = document.getElementById('upload-status-text');

let uploadedPhotoBase64 = null;

if (fileTrigger && fileInput) {
  fileTrigger.addEventListener('click', () => fileInput.click());
}

if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (Max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('⚠️ Image size must be less than 2MB.');
      fileInput.value = '';
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      alert('⚠️ Please upload an image file.');
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      uploadedPhotoBase64 = event.target.result;
      if (photoPreview) photoPreview.src = uploadedPhotoBase64;
      if (previewContainer) previewContainer.style.display = 'flex';
      if (uploadStatusText) {
        uploadStatusText.textContent = `Selected: ${file.name}`;
        uploadStatusText.style.color = 'var(--neon-green)';
      }
    };
    reader.readAsDataURL(file);
  });
}

if (btnRemovePhoto) {
  btnRemovePhoto.addEventListener('click', () => {
    if (fileInput) fileInput.value = '';
    uploadedPhotoBase64 = null;
    if (previewContainer) previewContainer.style.display = 'none';
    if (photoPreview) photoPreview.src = '';
    if (uploadStatusText) {
      uploadStatusText.textContent = 'Upload your photo (JPG, PNG - Max 2MB)';
      uploadStatusText.style.color = 'var(--text-gray)';
    }
  });
}

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

  if (step === 1) {
    const nameVal = document.getElementById('full-name').value.trim();
    const ageInput = document.getElementById('age');
    const ageVal = parseInt(ageInput.value);
    const genderVal = document.getElementById('gender').value;

    const errorName = document.getElementById('error-name');
    const errorAge = document.getElementById('error-age');
    const errorGender = document.getElementById('error-gender');

    // Name
    if (nameVal.length < 3) {
      errorName.style.display = 'block';
      document.getElementById('full-name').classList.add('invalid');
      isValid = false;
    } else {
      errorName.style.display = 'none';
      document.getElementById('full-name').classList.remove('invalid');
    }

    // Age (18 - 40)
    if (isNaN(ageVal) || ageVal < 18 || ageVal > 40) {
      errorAge.style.display = 'block';
      ageInput.classList.add('invalid');
      isValid = false;
    } else {
      errorAge.style.display = 'none';
      ageInput.classList.remove('invalid');
    }

    // Gender
    if (!genderVal) {
      errorGender.style.display = 'block';
      document.getElementById('gender').classList.add('invalid');
      isValid = false;
    } else {
      errorGender.style.display = 'none';
      document.getElementById('gender').classList.remove('invalid');
    }
  }

  if (step === 2) {
    const emailInput = document.getElementById('email');
    const emailVal = emailInput.value.trim();
    const phoneInput = document.getElementById('phone');
    const phoneVal = phoneInput.value.trim();
    const cityVal = document.getElementById('city').value;

    const errorEmail = document.getElementById('error-email');
    const errorPhone = document.getElementById('error-phone');
    const errorCity = document.getElementById('error-city');

    // Email Check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      errorEmail.style.display = 'block';
      emailInput.classList.add('invalid');
      isValid = false;
    } else {
      errorEmail.style.display = 'none';
      emailInput.classList.remove('invalid');
    }

    // Phone Check (Pakistani standard)
    const phoneRegex = /^(03[0-9]{9})|(\+923[0-9]{9})$/;
    if (!phoneRegex.test(phoneVal.replace(/[-\s]/g, ""))) {
      errorPhone.style.display = 'block';
      phoneInput.classList.add('invalid');
      isValid = false;
    } else {
      errorPhone.style.display = 'none';
      phoneInput.classList.remove('invalid');
    }

    // City Check
    if (!cityVal) {
      errorCity.style.display = 'block';
      document.getElementById('city').classList.add('invalid');
      isValid = false;
    } else {
      errorCity.style.display = 'none';
      document.getElementById('city').classList.remove('invalid');
    }
  }

  if (step === 3) {
    // Interest Checkbox verification (At least one)
    const interests = document.querySelectorAll('input[name="interests"]:checked');
    const errorInterests = document.getElementById('error-interests');
    
    if (interests.length === 0) {
      errorInterests.style.display = 'block';
      isValid = false;
    } else {
      errorInterests.style.display = 'none';
    }

    // Skill Dropdown verification
    const skillSelect = document.getElementById('digital-skill');
    const skillVal = skillSelect.value;
    const errorSkill = document.getElementById('error-skill');

    if (!skillVal) {
      errorSkill.style.display = 'block';
      skillSelect.classList.add('invalid');
      isValid = false;
    } else {
      errorSkill.style.display = 'none';
      skillSelect.classList.remove('invalid');
    }
  }

  if (step === 4) {
    // Pledge agreement
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

  if (!validateStep(4)) return;

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

  const skillMap = {
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
  const skillName = skillMap[skillVal] || 'Member';

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

      // Reset photo upload UI elements
      if (fileInput) fileInput.value = '';
      uploadedPhotoBase64 = null;
      if (previewContainer) previewContainer.style.display = 'none';
      if (photoPreview) photoPreview.src = '';
      if (uploadStatusText) {
        uploadStatusText.textContent = 'Upload your photo (JPG, PNG - Max 2MB)';
        uploadStatusText.style.color = 'var(--text-gray)';
      }

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
  // Hide video manifesto section if visible
  const videoSection = document.getElementById('video-manifesto-section');
  if (videoSection) videoSection.style.display = 'none';
  
  // Ensure registration section is visible
  const regFormSection = document.getElementById('registration-form-section');
  if (regFormSection) regFormSection.style.display = 'block';

  // Hide form content
  form.style.display = 'none';
  const formNavSteps = document.querySelector('.form-nav-steps');
  if (formNavSteps) formNavSteps.style.display = 'none';

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
  if (tierEl) {
    const activeTier = getFoundingTier(serialNum);
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

  // Capture card as PNG → upload to Vercel Blob → local notifications (no email)
  // Wait 600ms for card animations to settle before capture
  setTimeout(() => captureAndUploadCard(data), 600);
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
async function captureAndUploadCard(data) {
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
    autoDownloadPNG(canvas, data.idCode);

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
            <p class="card-status-title green">Card downloaded &amp; saved to cloud!</p>
            <p class="card-status-desc">
              Your ID card PNG was <strong>auto-downloaded</strong> to your device.<br>
              A cloud backup is also available below for 24 hours.
            </p>
            <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.6rem;">
              <a href="${result.cardUrl}" target="_blank" rel="noopener noreferrer"
                 class="card-download-link" download="CAP-Member-${data.idCode}.png">
                ☁️ Cloud Copy
              </a>
              <button class="card-download-link" id="btn-redownload"
                      style="border:none;cursor:pointer;">
                ⬇️ Download Again
              </button>
            </div>
            <span class="card-expiry-timer" id="expiry-timer">${renderTimer()}</span>
            <p style="font-size:0.78rem;color:var(--text-gray);margin-top:0.6rem;margin-bottom:0;">
              🗑️ Cloud copy auto-deletes after 48 hours. Your device download is permanent.
            </p>
          </div>
        </div>`;

      // Wire "Download Again" button
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
function downloadMemberCard() {
  // In pure client-side static environments without heavy canvas libraries,
  // we mock download by generating a text file with membership details
  // and trigger the printing window which can be saved as PDF.
  const name = document.getElementById('card-display-name').textContent;
  const city = document.getElementById('card-display-city').textContent;
  const skill = document.getElementById('card-display-skill').textContent;
  const idCode = document.getElementById('card-display-id').textContent;
  const serial = document.getElementById('card-display-serial').textContent;

  const cardDetails = `
=============================================
      COCKROACH AWAMI PARTY (CAP)
        YOUTH RESISTANCE MEMBER
=============================================
  NAME:         ${name}
  CITY:         ${city}
  SKILL:        ${skill}
  MEMBER ID:    ${idCode}
  SERIAL NUM:   ${serial}
  STATUS:       RESILIENT
=============================================
  Adapt, Survive, Rebuild.
  CAP.
=============================================
  `;
  
  const blob = new Blob([cardDetails], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CAP-Member-${name.replace(/\s+/g, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Direct printing option
  window.print();
}

function shareOnWhatsApp() {
  const idCode = document.getElementById('card-display-id').textContent;
  const message = `I just joined the Cockroach Awami Party (CAP)! 🪳 Pakistan's ultimate GenZ youth resistance movement. I got my Indestructible Digital Member Card with ID: ${idCode}. Join for free now to reclaim the future: ${window.location.href}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}


// --- 8. FAQ Accordion Logic ---
function toggleFaq(btn) {
  const item = btn.parentElement;
  const isActive = item.classList.contains('active');
  
  // Collapse other FAQ items
  document.querySelectorAll('.faq-item').forEach(faq => {
    faq.classList.remove('active');
    faq.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
  });

  if (!isActive) {
    item.classList.add('active');
    btn.setAttribute('aria-expanded', 'true');
  }
}

// Global Event Registration for card actions and FAQ accordion
document.addEventListener('DOMContentLoaded', () => {
  // Card actions
  const btnDownload = document.getElementById('btn-download-card');
  const btnShare = document.getElementById('btn-share-whatsapp');

  if (btnDownload) btnDownload.addEventListener('click', downloadMemberCard);
  if (btnShare) btnShare.addEventListener('click', shareOnWhatsApp);

  // FAQ accordion questions
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => toggleFaq(btn));
  });
});
