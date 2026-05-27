// MatchKing Configuration
const WHATSAPP_NUMBER = '+27810611435';
const USDT_ADDRESS = 'TNbDnfW5D6TTBoW22AorR7tyS1n4qojfKY';

// Track current purchase amount
let currentPurchaseAmount = 199;

document.addEventListener('DOMContentLoaded', function () {

  // Set current year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Modal elements
  const socialModal    = document.getElementById('socialModal');
  const challengeModal = document.getElementById('challengeModal');
  const demoModal      = document.getElementById('demoModal');
  const buyModal       = document.getElementById('buyModal');

  const socialModalClose    = document.getElementById('socialModalClose');
  const challengeModalClose = document.getElementById('challengeModalClose');
  const demoModalClose      = document.getElementById('demoModalClose');
  const buyModalClose       = document.getElementById('buyModalClose');

  function openModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'false');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // Show social modal after 600ms
  setTimeout(() => openModal(socialModal), 600);

  // Social modal close → show challenge modal
  if (socialModalClose) {
    socialModalClose.addEventListener('click', () => {
      closeModal(socialModal);
      setTimeout(() => openModal(challengeModal), 500);
    });
  }

  if (challengeModalClose) {
    challengeModalClose.addEventListener('click', () => closeModal(challengeModal));
  }
  if (demoModalClose) {
    demoModalClose.addEventListener('click', () => closeModal(demoModal));
  }
  if (buyModalClose) {
    buyModalClose.addEventListener('click', () => {
      closeModal(buyModal);
      resetPaymentModal();
    });
  }

  // Click outside modals to close
  [socialModal, challengeModal, demoModal, buyModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (modal === socialModal) {
          closeModal(modal);
          setTimeout(() => openModal(challengeModal), 500);
        } else {
          closeModal(modal);
          if (modal === buyModal) resetPaymentModal();
        }
      }
    });
  });

  // Pricing buttons
  const pricingBuyBasic = document.getElementById('pricingBuyBasic');
  const pricingBuyPro   = document.getElementById('pricingBuyPro');

  if (pricingBuyBasic) {
    pricingBuyBasic.addEventListener('click', () => openBuyModal(199));
  }
  if (pricingBuyPro) {
    pricingBuyPro.addEventListener('click', () => openBuyModal(299));
  }

  // Demo form
  const demoForm = document.getElementById('demoForm');
  if (demoForm) {
    demoForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const data = new FormData(demoForm);
      const name  = data.get('name');
      const email = data.get('email');
      closeModal(demoModal);
      alert(`Thank you, ${name}! ♛\n\nWe'll contact you at ${email} to schedule your MatchKing demo.`);
      demoForm.reset();
    });
  }

  // Smooth scroll
  document.querySelectorAll('.navbar-link').forEach(link => {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
          const navMenu = document.getElementById('navMenu');
          if (navMenu) navMenu.classList.remove('active');
        }
      }
    });
  });

  // Mobile menu toggle
  const navToggle = document.getElementById('navToggle');
  const navMenu   = document.getElementById('navMenu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      navMenu.classList.toggle('active');
    });
  }

});

// Open buy modal with specific price
function openBuyModal(price) {
  currentPurchaseAmount = price;
  const modal      = document.getElementById('buyModal');
  const title      = modal.querySelector('.buy-modal-title');
  const desc       = modal.querySelector('.buy-modal-desc');
  const warningTxt = document.getElementById('buyWarningText');

  const planName = price === 299 ? 'Tool + Mentorship' : 'MatchKing Tool';
  title.textContent = `Purchase ${planName} – ${price} USDT`;
  desc.textContent  = `Send exactly ${price} USDT (TRC20) to the address below. You'll receive instant access after payment verification.`;
  warningTxt.innerHTML = `<strong>⚠️ Important:</strong> Send exactly ${price} USDT on the Tron network (TRC20). Other amounts or networks will not be processed.`;

  modal.setAttribute('aria-hidden', 'false');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

// Copy USDT address
function copyToClipboard() {
  const addressInput = document.getElementById('usdtAddress');
  if (addressInput) {
    addressInput.select();
    document.execCommand('copy');
    const btn = event.target;
    const original = btn.textContent;
    btn.textContent = 'Copied! ♛';
    setTimeout(() => { btn.textContent = original; }, 2000);
  }
}

// Step 1 → Step 2
function proceedToVerification() {
  const email = document.getElementById('paymentEmail').value;
  if (!email) {
    alert('Please enter your email address to proceed.');
    return;
  }
  sessionStorage.setItem('paymentEmail', email);
  document.getElementById('paymentStep1').style.display = 'none';
  document.getElementById('paymentStep2').style.display = 'block';
}

// Step 2 → Step 1
function goBackToEmail() {
  document.getElementById('paymentStep2').style.display = 'none';
  document.getElementById('paymentStep1').style.display = 'block';
  const msgDiv = document.getElementById('verificationMessage');
  if (msgDiv) msgDiv.style.display = 'none';
  const txInput = document.getElementById('transactionHash');
  if (txInput) txInput.value = '';
}

// Verify payment via Tronscan
async function verifyTransaction() {
  const txHash    = document.getElementById('transactionHash').value.trim();
  const email     = sessionStorage.getItem('paymentEmail');
  const verifyBtn = document.getElementById('verifyBtn');
  const msgDiv    = document.getElementById('verificationMessage');

  if (!txHash) {
    alert('Please paste the transaction hash.');
    return;
  }

  verifyBtn.disabled     = true;
  verifyBtn.textContent  = 'Verifying...';
  msgDiv.style.display   = 'none';

  try {
    const response = await fetch(`https://apilist.tronscan.org/api/transaction-info?hash=${txHash}`);
    const data     = await response.json();

    if (!data || !data.contractData) {
      showVerificationError(msgDiv, 'Transaction not found. Please check the hash and try again.');
      verifyBtn.disabled    = false;
      verifyBtn.textContent = 'Verify Payment';
      return;
    }

    const contractData = data.contractData;
    const txValue      = contractData.amount ? (contractData.amount / 1000000) : 0;
    const toAddress    = contractData.to || '';

    if (toAddress.toLowerCase() !== USDT_ADDRESS.toLowerCase()) {
      showVerificationError(msgDiv, '❌ Transaction sent to wrong address. Please verify and resend to the correct address.');
      verifyBtn.disabled    = false;
      verifyBtn.textContent = 'Verify Payment';
      return;
    }

    if (txValue !== currentPurchaseAmount) {
      showVerificationError(msgDiv, `❌ Incorrect amount. Expected ${currentPurchaseAmount} USDT, but received ${txValue} USDT.`);
      verifyBtn.disabled    = false;
      verifyBtn.textContent = 'Verify Payment';
      return;
    }

    showVerificationSuccess(msgDiv, txHash, email);
    setTimeout(() => {
      document.getElementById('buyModal').setAttribute('aria-hidden', 'true');
      document.getElementById('buyModal').style.display = 'none';
      document.body.style.overflow = '';
      resetPaymentModal();
    }, 3500);

  } catch (error) {
    console.error('Verification error:', error);
    showVerificationError(msgDiv, 'Error verifying transaction. Please try again or contact support.');
    verifyBtn.disabled    = false;
    verifyBtn.textContent = 'Verify Payment';
  }
}

function showVerificationSuccess(msgDiv, txHash, email) {
  msgDiv.style.background  = 'rgba(201, 168, 76, 0.1)';
  msgDiv.style.borderLeft  = '4px solid var(--gold)';
  msgDiv.style.color       = 'var(--gold-light)';
  msgDiv.style.padding     = '12px';
  msgDiv.style.borderRadius= '4px';
  msgDiv.innerHTML = `
    <strong>♛ Payment Verified!</strong><br/>
    Transaction: ${txHash.substring(0, 20)}…<br/>
    Email: ${email}<br/><br/>
    Access credentials are being sent to your email now. Welcome to MatchKing!
  `;
  msgDiv.style.display = 'block';
  document.getElementById('verifyBtn').style.display = 'none';
}

function showVerificationError(msgDiv, message) {
  msgDiv.style.background  = 'rgba(244, 67, 54, 0.1)';
  msgDiv.style.borderLeft  = '4px solid #f44336';
  msgDiv.style.color       = '#ff6a6a';
  msgDiv.style.padding     = '12px';
  msgDiv.style.borderRadius= '4px';
  msgDiv.innerHTML = message;
  msgDiv.style.display = 'block';
}

function resetPaymentModal() {
  const step1  = document.getElementById('paymentStep1');
  const step2  = document.getElementById('paymentStep2');
  const msgDiv = document.getElementById('verificationMessage');
  const email  = document.getElementById('paymentEmail');
  const txHash = document.getElementById('transactionHash');
  const btn    = document.getElementById('verifyBtn');

  if (step1)  step1.style.display  = 'block';
  if (step2)  step2.style.display  = 'none';
  if (msgDiv) { msgDiv.style.display = 'none'; msgDiv.innerHTML = ''; }
  if (email)  email.value  = '';
  if (txHash) txHash.value = '';
  if (btn) {
    btn.style.display = 'block';
    btn.disabled      = false;
    btn.textContent   = 'Verify Payment';
  }
}

// Close social modal → show challenge modal
function closeSocialModal() {
  const socialModal    = document.getElementById('socialModal');
  const challengeModal = document.getElementById('challengeModal');
  if (socialModal) {
    socialModal.setAttribute('aria-hidden', 'true');
    socialModal.style.display = 'none';
    document.body.style.overflow = '';
  }
  setTimeout(() => {
    if (challengeModal) {
      challengeModal.setAttribute('aria-hidden', 'false');
      challengeModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }, 500);
}

// WhatsApp proof message
function openWhatsAppProof() {
  const emailInput = document.getElementById('paymentEmail');
  const txInput    = document.getElementById('transactionHash');
  const email  = (emailInput && emailInput.value) ? emailInput.value : (sessionStorage.getItem('paymentEmail') || '');
  const txHash = (txInput && txInput.value) ? txInput.value : '';

  const message = `Hello MatchKing ♛,\n\nI sent ${currentPurchaseAmount} USDT (TRC20) to ${USDT_ADDRESS}.\nEmail: ${email}\nTransaction hash: ${txHash}\n\nI have attached a screenshot of the payment. Please confirm my access.`;
  const waUrl   = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

// Navigate to tool
function goToTool() {
  window.location.href = '/tool/';
}