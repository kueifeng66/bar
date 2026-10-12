/**
 * Little Mary Retro Arcade - Core Game State Machine & Rules
 * Features:
 * - 24-slot border ring indexing & layout
 * - Realistic deceleration timing curve & pitch modulation
 * - Balanced arcade RTP weighted landing algorithm
 * - Special slots: BAR Jackpot chained lights, ONCE MORE free spins, X2/X25/X50 multipliers
 * - Double-Up (比大小) gamble mini-game
 * - Synchronized LED 7-segment display driver
 */

// Golden Star SVGs with gradient #FFC107, darker outline #B45309, and 3D specular highlight
const GOLDEN_STAR_SVG = `<svg class="golden-star-svg" viewBox="0 0 100 100" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold-star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF9C4" />
      <stop offset="25%" stop-color="#FFD54F" />
      <stop offset="60%" stop-color="#FFC107" />
      <stop offset="100%" stop-color="#FFA000" />
    </linearGradient>
  </defs>
  <polygon points="50,6 64,36 98,38 72,61 80,95 50,76 20,95 28,61 2,38 36,36"
    fill="url(#gold-star-grad)" stroke="#B45309" stroke-width="4" stroke-linejoin="round" />
  <polygon points="50,14 60,37 85,39 65,57 71,83 50,67"
    fill="#FFFDE7" opacity="0.55" />
</svg>`;

const GOLDEN_STAR_BTN_SVG = `<svg class="golden-star-svg btn-star-svg" viewBox="0 0 100 100" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="gold-star-grad-btn" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF9C4" />
      <stop offset="25%" stop-color="#FFD54F" />
      <stop offset="60%" stop-color="#FFC107" />
      <stop offset="100%" stop-color="#FFA000" />
    </linearGradient>
  </defs>
  <polygon points="50,6 64,36 98,38 72,61 80,95 50,76 20,95 28,61 2,38 36,36"
    fill="url(#gold-star-grad-btn)" stroke="#B45309" stroke-width="4" stroke-linejoin="round" />
  <polygon points="50,14 60,37 85,39 65,57 71,83 50,67"
    fill="#FFFDE7" opacity="0.55" />
</svg>`;

// 8 Bet Symbols definition
const SYMBOLS = {
  bar: { id: 'bar', name: 'BAR', nameZh: 'BAR', multiplier: 100, color: '#E60012', icon: 'BAR' },
  seven: { id: 'seven', name: '77', nameZh: '雙七', multiplier: 50, color: '#E60012', icon: '77' },
  star: { id: 'star', name: 'Star', nameZh: '星星', multiplier: 40, color: '#FFC107', icon: '★' },
  watermelon: { id: 'watermelon', name: 'Watermelon', nameZh: '西瓜', multiplier: 30, color: '#22c55e', icon: '🍉' },
  bell: { id: 'bell', name: 'Bell', nameZh: '鈴鐺', multiplier: 20, color: '#eab308', icon: '🔔' },
  papaya: { id: 'papaya', name: 'Papaya', nameZh: '木瓜', multiplier: 15, color: '#f97316', icon: '🥭' },
  orange: { id: 'orange', name: 'Orange', nameZh: '橘子', multiplier: 10, color: '#fb923c', icon: '🍊' },
  apple: { id: 'apple', name: 'Apple', nameZh: '蘋果', multiplier: 5, color: '#f43f5e', icon: '🍎' }
};

// 24 Border Slots Layout (Clockwise: Top -> Right -> Bottom -> Left)
// Includes 5 spread-out Gift Light (送燈) prize slots: Small (x2), Medium (x2), Large (x1)
const RING_SLOTS = [
  // Top Row (0..6)
  { id: 0, type: 'symbol', symbol: 'bar', label: 'BAR 100x', gridArea: '1 / 1' },
  { id: 1, type: 'symbol', symbol: 'apple', label: '蘋果 5x', gridArea: '1 / 2' },
  { id: 2, type: 'symbol', symbol: 'papaya', label: '木瓜 15x', gridArea: '1 / 3' },
  { id: 3, type: 'special', special: 'gift_small', label: '小送燈 2~3燈', gridArea: '1 / 4' },
  { id: 4, type: 'symbol', symbol: 'watermelon', label: '西瓜 30x', gridArea: '1 / 5' },
  { id: 5, type: 'special', special: 'once_more', label: '送一次', gridArea: '1 / 6' },
  { id: 6, type: 'symbol', symbol: 'apple', label: '蘋果 5x', gridArea: '1 / 7' },

  // Right Column (7..11)
  { id: 7, type: 'symbol', symbol: 'bell', label: '鈴鐺 20x', gridArea: '2 / 7' },
  { id: 8, type: 'symbol', symbol: 'orange', label: '橘子 10x', gridArea: '3 / 7' },
  { id: 9, type: 'symbol', symbol: 'seven', label: '77 50x', gridArea: '4 / 7' },
  { id: 10, type: 'special', special: 'gift_medium', label: '中送燈 5~6燈', gridArea: '5 / 7' },
  { id: 11, type: 'symbol', symbol: 'star', label: '星星 40x', gridArea: '6 / 7' },

  // Bottom Row (12..18, right-to-left)
  { id: 12, type: 'symbol', symbol: 'papaya', label: '木瓜 15x', gridArea: '7 / 7' },
  { id: 13, type: 'special', special: 'gift_large', label: '大送燈 8~10燈', gridArea: '7 / 6' },
  { id: 14, type: 'symbol', symbol: 'watermelon', label: '西瓜 30x', gridArea: '7 / 5' },
  { id: 15, type: 'symbol', symbol: 'bell', label: '鈴鐺 20x', gridArea: '7 / 4' },
  { id: 16, type: 'symbol', symbol: 'apple', label: '蘋果 5x', gridArea: '7 / 3' },
  { id: 17, type: 'symbol', symbol: 'orange', label: '橘子 10x', gridArea: '7 / 2' },
  { id: 18, type: 'symbol', symbol: 'seven', label: '77 50x', gridArea: '7 / 1' },

  // Left Column (19..23, bottom-to-top)
  { id: 19, type: 'special', special: 'gift_small', label: '小送燈 2~3燈', gridArea: '6 / 1' },
  { id: 20, type: 'symbol', symbol: 'star', label: '星星 40x', gridArea: '5 / 1' },
  { id: 21, type: 'symbol', symbol: 'apple', label: '蘋果 5x', gridArea: '4 / 1' },
  { id: 22, type: 'symbol', symbol: 'papaya', label: '木瓜 15x', gridArea: '3 / 1' },
  { id: 23, type: 'special', special: 'gift_medium', label: '中送燈 5~6燈', gridArea: '2 / 1' }
];

// Weighted Random Table for authentic 1990s arcade RTP (~96.5%)
const SLOT_WEIGHTS = {
  0: 2,   // BAR (100x) - rare
  1: 15,  // Apple
  2: 9,   // Papaya
  3: 4,   // gift_small (小送燈 2~3燈)
  4: 6,   // Watermelon
  5: 6,   // Once More (送一次)
  6: 15,  // Apple
  7: 8,   // Bell
  8: 12,  // Orange
  9: 3,   // 77 (50x)
  10: 2,  // gift_medium (中送燈 5~6燈)
  11: 4,  // Star
  12: 9,  // Papaya
  13: 1,  // gift_large (大送燈 8~10燈 / 滿盤 - ultra rare)
  14: 6,  // Watermelon
  15: 8,  // Bell
  16: 15, // Apple
  17: 12, // Orange
  18: 3,  // 77
  19: 4,  // gift_small (小送燈 2~3燈)
  20: 4,  // Star
  21: 15, // Apple
  22: 9,  // Papaya
  23: 2   // gift_medium (中送燈 5~6燈)
};

class LittleMaryGame {
  constructor() {
    this.credit = 50; // Initial complimentary credits
    this.totalInserted = 50; // Initial NT$50 inserted (1 coin = NT$10 = 10 credits)
    this.insertedTempTimer = null;
    this.bonusWin = 0;
    this.currentBets = {
      bar: 0,
      seven: 0,
      star: 0,
      watermelon: 0,
      bell: 0,
      papaya: 0,
      orange: 0,
      apple: 0
    };
    this.previousBets = null;
    this.currentLightIndex = 0;
    this.state = 'IDLE'; // IDLE, SPINNING, WIN_DECISION, DOUBLE_UP, PAYING_OUT
    this.freeSpinsRemaining = 0;
    this.pocketBank = 0;
    this.doubleUpStake = 0;
    this.doubleUpRound = 1;
    this.maxDoubleUpRounds = Infinity;
    this.stakeCap = 9999999;

    // Timers & intervals for fail-safe state machines
    this.doubleUpTimer = null;
    this.safeguardTimer = null;
    this.scoreCountUpInterval = null;
    this.raiseAnimInterval = null;

    // Attract mode light timer
    this.attractTimer = null;
    this.attractStep = 0;
  }

  /**
   * Register a coin insertion (+NT$10):
   * Updates top-right inserted LED display, flashes box,
   * temporarily shows "本次投幣 +NT$10" for 2s, then reverts to total inserted.
   */
  registerCoinInserted(amount = 10) {
    this.totalInserted += amount;
    const boxInserted = document.getElementById('box-top-inserted');
    const labelInserted = document.getElementById('label-top-inserted');
    const dispInserted = document.getElementById('display-inserted');

    if (boxInserted) {
      boxInserted.classList.remove('led-flash');
      void boxInserted.offsetWidth; // Reflow
      boxInserted.classList.add('led-flash');
      setTimeout(() => boxInserted.classList.remove('led-flash'), 450);
    }

    if (labelInserted) {
      labelInserted.textContent = `本次投幣 +NT$${amount}`;
    }
    if (dispInserted) {
      dispInserted.textContent = String(this.credit).padStart(4, '0');
    }

    if (this.insertedTempTimer) clearTimeout(this.insertedTempTimer);
    this.insertedTempTimer = setTimeout(() => {
      if (labelInserted) labelInserted.textContent = '玩家餘額 CREDIT';
      if (dispInserted) dispInserted.textContent = String(this.credit).padStart(4, '0');
    }, 2000);
  }

  init() {
    this.renderBoard();
    this.renderBetControls();
    this.updateLEDDisplays();
    this.startAttractMode();
  }

  // --- RENDERING UI ---

  renderBoard() {
    const ringContainer = document.getElementById('light-ring-grid');
    if (!ringContainer) return;

    // Remove only previous slot-cell elements, NEVER delete #center-playfield!
    ringContainer.querySelectorAll('.slot-cell').forEach((el) => el.remove());

    const centerPlayfield = document.getElementById('center-playfield');

    RING_SLOTS.forEach((slot) => {
      const el = document.createElement('div');
      el.className = 'slot-cell';
      el.id = `slot-${slot.id}`;
      el.style.gridArea = slot.gridArea;

      let iconHtml = '';
      let badgeHtml = '';
      let subText = '';

      if (slot.type === 'symbol') {
        const sym = SYMBOLS[slot.symbol];
        if (slot.symbol === 'star') {
          iconHtml = `<span class="slot-icon ${slot.symbol}">${GOLDEN_STAR_SVG}</span>`;
        } else {
          iconHtml = `<span class="slot-icon ${slot.symbol}">${sym.icon}</span>`;
        }
        badgeHtml = `<span class="slot-mult">${sym.multiplier}x</span>`;
        subText = `<span class="slot-name">${sym.nameZh}</span>`;
        el.setAttribute('data-symbol', slot.symbol);
      } else {
        el.classList.add('special-slot', slot.special);
        if (slot.special === 'gift_small') {
          iconHtml = `<span class="slot-icon gift-icon gift-small-icon">✨</span>`;
          badgeHtml = `<span class="slot-mult bonus-badge gift-small-badge">2~3燈</span>`;
          subText = `<span class="slot-name gift-small-name">小送燈</span>`;
          el.classList.add('gift-small');
        } else if (slot.special === 'gift_medium') {
          iconHtml = `<span class="slot-icon gift-icon gift-medium-icon">🌟</span>`;
          badgeHtml = `<span class="slot-mult bonus-badge gift-medium-badge">5~6燈</span>`;
          subText = `<span class="slot-name gift-medium-name">中送燈</span>`;
          el.classList.add('gift-medium');
        } else if (slot.special === 'gift_large') {
          iconHtml = `<span class="slot-icon gift-icon gift-large-icon">👑</span>`;
          badgeHtml = `<span class="slot-mult bonus-badge gift-large-badge">8~10燈</span>`;
          subText = `<span class="slot-name gift-large-name">大送燈</span>`;
          el.classList.add('gift-large');
        } else if (slot.special === 'once_more') {
          iconHtml = `<span class="slot-icon free-spin">🔄</span>`;
          badgeHtml = `<span class="slot-mult bonus-badge">FREE</span>`;
          subText = `<span class="slot-name">送一次</span>`;
        } else if (slot.special === 'x2') {
          iconHtml = `<span class="slot-icon mult-x2">2X</span>`;
          badgeHtml = `<span class="slot-mult bonus-badge">BONUS</span>`;
          subText = `<span class="slot-name">雙倍</span>`;
        } else if (slot.special === 'x25') {
          iconHtml = `<span class="slot-icon mult-x25">25X</span>`;
          badgeHtml = `<span class="slot-mult bonus-badge">SUPER</span>`;
          subText = `<span class="slot-name">幸運獎</span>`;
        } else if (slot.special === 'x50') {
          iconHtml = `<span class="slot-icon mult-x50">50X</span>`;
          badgeHtml = `<span class="slot-mult bonus-badge">JACKPOT</span>`;
          subText = `<span class="slot-name">大滿貫</span>`;
        }
      }

      el.innerHTML = `
        <div class="slot-bulb"></div>
        <div class="slot-inner">
          ${badgeHtml}
          ${iconHtml}
          ${subText}
        </div>
      `;

      if (centerPlayfield) {
        ringContainer.insertBefore(el, centerPlayfield);
      } else {
        ringContainer.appendChild(el);
      }
    });

    this.highlightSlot(this.currentLightIndex);
  }

  renderBetControls() {
    const rowContainer = document.getElementById('bet-and-start-row');
    if (!rowContainer) return;

    // Keep #btn-start at the 9th position
    const startBtn = document.getElementById('btn-start');
    rowContainer.querySelectorAll('.arcade-bet-btn').forEach((b) => b.remove());

    const order = ['bar', 'seven', 'star', 'watermelon', 'bell', 'papaya', 'orange', 'apple'];

    order.forEach((key, index) => {
      const sym = SYMBOLS[key];
      const btn = document.createElement('button');
      btn.className = `arcade-bet-btn btn-bet-${key} ${key}`;
      btn.id = `btn-bet-${key}`;
      const iconHtml = (key === 'star') ? GOLDEN_STAR_BTN_SVG : sym.icon;
      btn.innerHTML = `
        <div class="btn-top-mult">${sym.multiplier}X</div>
        <div class="btn-icon ${key}">${iconHtml}</div>
        <div class="btn-label">${sym.nameZh}</div>
        <div class="btn-bet-counter" id="bet-val-${key}">0</div>
        <div class="btn-shortcut">[${index + 1}]</div>
      `;

      btn.addEventListener('click', () => {
        this.addBet(key);
      });

      if (startBtn) {
        rowContainer.insertBefore(btn, startBtn);
      } else {
        rowContainer.appendChild(btn);
      }
    });
  }

  updateLEDDisplays() {
    const creditEl = document.getElementById('display-credit');
    const winEl = document.getElementById('display-win');
    const betEl = document.getElementById('display-bet');
    const topWonEl = document.getElementById('display-won');
    const topInsertedEl = document.getElementById('display-inserted');

    // Issue 2: Keep top-left won and bottom win displays showing double-up stake during gamble
    const activeWinAmount = (this.state.startsWith('DOUBLE_UP')) ? this.doubleUpStake : this.bonusWin;

    // Issue 1 & 3: Top-right display represents player balance (credit), synchronised in real time
    if (creditEl) creditEl.textContent = String(this.credit).padStart(4, '0');
    if (winEl) winEl.textContent = String(activeWinAmount).padStart(4, '0');
    if (betEl) betEl.textContent = String(this.getTotalBet()).padStart(3, '0');
    if (topWonEl) topWonEl.textContent = String(activeWinAmount).padStart(4, '0');
    if (topInsertedEl) topInsertedEl.textContent = String(this.credit).padStart(4, '0');

    // Update individual bet badges
    Object.keys(this.currentBets).forEach((k) => {
      const valEl = document.getElementById(`bet-val-${k}`);
      if (valEl) {
        valEl.textContent = this.currentBets[k];
        valEl.classList.toggle('has-bet', this.currentBets[k] > 0);
      }
    });

    this.updateControlsState();
  }

  getTotalBet() {
    return Object.values(this.currentBets).reduce((a, b) => a + b, 0);
  }

  promptCoinSlot() {
    const readyLamp = document.getElementById('coin-ready-lamp');
    const metalSlot = document.getElementById('metal-coin-slot');
    if (readyLamp) {
      readyLamp.classList.remove('lamp-prompt-blink');
      void readyLamp.offsetWidth;
      readyLamp.classList.add('lamp-prompt-blink');
    }
    if (metalSlot) {
      metalSlot.classList.remove('slot-prompt-glow');
      void metalSlot.offsetWidth;
      metalSlot.classList.add('slot-prompt-glow');
    }
  }

  updateControlsState() {
    const startBtn = document.getElementById('btn-start');
    const collectBtn = document.getElementById('btn-collect');
    const enterDoubleBtn = document.getElementById('btn-enter-double');
    const coinOutBtn = document.getElementById('btn-coin-out');
    const smallBtn = document.getElementById('btn-gamble-small');
    const bigBtn = document.getElementById('btn-gamble-big');
    const directCollectBtn = document.getElementById('btn-du-choice-collect');
    const btnRaise1 = document.getElementById('btn-du-raise-1');
    const btnRaise10 = document.getElementById('btn-du-raise-10');
    const btnRaiseHalf = document.getElementById('btn-du-raise-half');
    const btnRaiseAll = document.getElementById('btn-du-raise-all');

    const totalBet = this.getTotalBet();
    const hasBet = totalBet > 0;
    const totalFunds = this.credit + totalBet;
    const hasFunds = totalFunds > 0;
    const isFreeSpin = this.freeSpinsRemaining > 0;

    // Issue 4: Enabled only when (credit + bets > 0) AND at least one fruit has bet, or during free spin
    const canSpin = this.state === 'IDLE' && (isFreeSpin || (hasBet && hasFunds));
    const canGamble = this.state === 'WIN_DECISION' && this.bonusWin > 0;
    const isDoubleUpActive = this.state === 'DOUBLE_UP_READY' || this.state === 'DOUBLE_UP_REVEALING' || this.state === 'DOUBLE_UP_WON';

    // 1. START Button: enabled when CREDIT + BET > 0 and bet > 0; light blinks when ready, greyed out otherwise or spinning
    if (startBtn) {
      startBtn.disabled = !canSpin;
      startBtn.classList.toggle('start-blinking', canSpin);
    }

    // Issue 4 suggestion: Flash coin slot and lamp when out of money (credit === 0 and totalBet === 0 in IDLE)
    const readyLamp = document.getElementById('coin-ready-lamp');
    const metalSlot = document.getElementById('metal-coin-slot');
    const isOutOfMoney = (this.credit === 0 && totalBet === 0 && this.state === 'IDLE');
    if (readyLamp) {
      readyLamp.classList.toggle('lamp-prompt-blink', isOutOfMoney);
    }
    if (metalSlot) {
      metalSlot.classList.toggle('slot-prompt-glow', isOutOfMoney);
    }

    // 2. COIN OUT Button: Single-click instant payout
    // Enabled when (bonusWin > 0 || credit > 0) AND not spinning, not in double-up, not currently paying out
    if (coinOutBtn) {
      const hasCoinOutFunds = this.bonusWin > 0 || this.credit > 0;
      const isForbiddenState = this.state === 'SPINNING' || isDoubleUpActive || this.state === 'PAYING_OUT' || this.state === 'COLLECTING';
      const canCoinOut = hasCoinOutFunds && !isForbiddenState;
      coinOutBtn.disabled = !canCoinOut;
    }

    // Mirrored Action Bar & Center Arena Double-Up Controls
    const btnBarSmall = document.getElementById('btn-bar-small');
    const btnBarBig = document.getElementById('btn-bar-big');
    const btnBarCollect = document.getElementById('btn-bar-collect');
    const btnBarContinue = document.getElementById('btn-bar-continue');
    const choiceRow = document.getElementById('du-choice-buttons');
    const winActionsRow = document.getElementById('du-win-actions');
    const postCollect = document.getElementById('btn-du-post-collect');
    const postContinue = document.getElementById('btn-du-post-continue');

    const isReadyForPick = this.state === 'DOUBLE_UP_READY';
    const isUnderCap = this.doubleUpStake < this.stakeCap;

    if (this.state === 'WIN_DECISION') {
      if (collectBtn) {
        collectBtn.style.display = '';
        collectBtn.disabled = this.bonusWin <= 0;
        collectBtn.classList.toggle('pulse-glow', this.bonusWin > 0);
      }
      if (enterDoubleBtn) {
        enterDoubleBtn.style.display = '';
        enterDoubleBtn.disabled = this.bonusWin <= 0;
        enterDoubleBtn.classList.toggle('pulse-glow', this.bonusWin > 0);
      }
      if (btnBarSmall) btnBarSmall.style.display = 'none';
      if (btnBarBig) btnBarBig.style.display = 'none';
      if (btnBarCollect) btnBarCollect.style.display = 'none';
      if (btnBarContinue) btnBarContinue.style.display = 'none';

      if (choiceRow) choiceRow.style.display = 'flex';
      if (winActionsRow) winActionsRow.style.display = 'none';
    } else if (this.state === 'DOUBLE_UP_READY') {
      if (collectBtn) collectBtn.style.display = 'none';
      if (enterDoubleBtn) enterDoubleBtn.style.display = 'none';
      if (btnBarSmall) {
        btnBarSmall.style.display = '';
        btnBarSmall.disabled = false;
      }
      if (btnBarBig) {
        btnBarBig.style.display = '';
        btnBarBig.disabled = false;
      }
      if (btnBarCollect) {
        btnBarCollect.style.display = '';
        btnBarCollect.disabled = this.doubleUpStake <= 0;
      }
      if (btnBarContinue) btnBarContinue.style.display = 'none';

      if (choiceRow) choiceRow.style.display = 'flex';
      if (winActionsRow) winActionsRow.style.display = 'none';
      if (smallBtn) smallBtn.disabled = false;
      if (bigBtn) bigBtn.disabled = false;
      if (directCollectBtn) directCollectBtn.disabled = this.doubleUpStake <= 0;
    } else if (this.state === 'DOUBLE_UP_REVEALING') {
      if (collectBtn) collectBtn.style.display = 'none';
      if (enterDoubleBtn) enterDoubleBtn.style.display = 'none';
      if (btnBarSmall) {
        btnBarSmall.style.display = '';
        btnBarSmall.disabled = true;
      }
      if (btnBarBig) {
        btnBarBig.style.display = '';
        btnBarBig.disabled = true;
      }
      if (btnBarCollect) {
        btnBarCollect.style.display = '';
        btnBarCollect.disabled = true;
      }
      if (btnBarContinue) btnBarContinue.style.display = 'none';

      if (smallBtn) smallBtn.disabled = true;
      if (bigBtn) bigBtn.disabled = true;
      if (directCollectBtn) directCollectBtn.disabled = true;
    } else if (this.state === 'DOUBLE_UP_WON') {
      if (collectBtn) collectBtn.style.display = 'none';
      if (enterDoubleBtn) enterDoubleBtn.style.display = 'none';
      if (btnBarSmall) btnBarSmall.style.display = 'none';
      if (btnBarBig) btnBarBig.style.display = 'none';
      if (btnBarCollect) {
        btnBarCollect.style.display = '';
        btnBarCollect.disabled = false;
        btnBarCollect.classList.add('pulse-glow');
      }
      if (btnBarContinue) {
        btnBarContinue.style.display = '';
        btnBarContinue.disabled = false;
        btnBarContinue.classList.add('pulse-glow');
      }

      if (choiceRow) choiceRow.style.display = 'flex';
      if (smallBtn) smallBtn.disabled = true;
      if (bigBtn) bigBtn.disabled = true;
      if (directCollectBtn) directCollectBtn.disabled = false;
      if (winActionsRow) winActionsRow.style.display = 'none';
      if (postCollect) postCollect.disabled = false;
      if (postContinue) postContinue.disabled = false;
    } else {
      // IDLE, SPINNING, PAYING_OUT, COLLECTING
      if (collectBtn) {
        collectBtn.style.display = '';
        collectBtn.disabled = true;
        collectBtn.classList.remove('pulse-glow');
      }
      if (enterDoubleBtn) {
        enterDoubleBtn.style.display = '';
        enterDoubleBtn.disabled = true;
        enterDoubleBtn.classList.remove('pulse-glow');
      }
      if (btnBarSmall) btnBarSmall.style.display = 'none';
      if (btnBarBig) btnBarBig.style.display = 'none';
      if (btnBarCollect) btnBarCollect.style.display = 'none';
      if (btnBarContinue) btnBarContinue.style.display = 'none';

      if (smallBtn) smallBtn.disabled = true;
      if (bigBtn) bigBtn.disabled = true;
      if (directCollectBtn) directCollectBtn.disabled = true;
      if (choiceRow) choiceRow.style.display = 'flex';
      if (winActionsRow) winActionsRow.style.display = 'none';
    }

    // Double-Up Raise buttons (+1, +10, +Half, +All)
    // Only enabled when in DOUBLE_UP_READY and not exceeding stakeCap
    // and player's CREDIT is sufficient for that specific raise amount
    if (btnRaise1) {
      btnRaise1.disabled = !isReadyForPick || !isUnderCap || this.credit < 1;
    }
    if (btnRaise10) {
      btnRaise10.disabled = !isReadyForPick || !isUnderCap || this.credit < 10;
    }
    if (btnRaiseHalf) {
      btnRaiseHalf.disabled = !isReadyForPick || !isUnderCap || this.credit < 2;
    }
    if (btnRaiseAll) {
      btnRaiseAll.disabled = !isReadyForPick || !isUnderCap || this.credit < 1;
    }

    // Toggle mascot artwork vs Double-Up panel in center playfield
    const centerMid = document.getElementById('center-mid-section');
    if (centerMid) {
      centerMid.classList.toggle('in-double-up-mode', isDoubleUpActive);
    }
    const mascotBox = document.getElementById('mascot-art-box');
    const doubleUpPanel = document.getElementById('double-up-panel');
    if (mascotBox && doubleUpPanel) {
      if (isDoubleUpActive) {
        mascotBox.style.display = 'none';
        doubleUpPanel.style.display = 'flex';
      } else {
        mascotBox.style.display = 'flex';
        doubleUpPanel.style.display = 'none';
      }
    }
  }

  // --- BET ACTIONS ---

  addBet(symbolKey, amount = 1) {
    if (this.state !== 'IDLE' && this.state !== 'WIN_DECISION') return;

    // If currently in win decision, taking new bet automatically collects win
    if (this.state === 'WIN_DECISION') {
      this.collectWin();
    }

    if (this.credit < amount) {
      this.showMessage('請投幣！CREDIT 餘額不足', 'warning');
      this.promptCoinSlot();
      if (window.audioEngine) window.audioEngine.playDoubleUpLose();
      return;
    }

    this.stopAttractMode();
    this.credit -= amount;
    this.currentBets[symbolKey] += amount;

    if (window.audioEngine) {
      window.audioEngine.playBetBlip(1.0 + (this.currentBets[symbolKey] * 0.05));
    }

    this.updateLEDDisplays();
  }

  betAll() {
    if (this.state !== 'IDLE') return;
    const keys = Object.keys(this.currentBets);
    if (this.credit < keys.length) {
      this.showMessage('CREDIT 不足以全押', 'warning');
      return;
    }
    keys.forEach((k) => this.addBet(k, 1));
  }

  clearBets() {
    if (this.state !== 'IDLE') return;
    const total = this.getTotalBet();
    if (total === 0) return;

    this.credit += total;
    Object.keys(this.currentBets).forEach((k) => {
      this.currentBets[k] = 0;
    });

    if (window.audioEngine) window.audioEngine.playButtonClick();
    this.updateLEDDisplays();
    this.showMessage('已退回所有押注', 'info');
  }

  repeatBet() {
    if (this.state !== 'IDLE' || !this.previousBets) return;
    const prevTotal = Object.values(this.previousBets).reduce((a, b) => a + b, 0);

    if (this.credit < prevTotal) {
      this.showMessage('CREDIT 不足以重複押注', 'warning');
      return;
    }

    // Clear current first
    this.clearBets();
    this.credit -= prevTotal;
    Object.keys(this.previousBets).forEach((k) => {
      this.currentBets[k] = this.previousBets[k];
    });

    if (window.audioEngine) window.audioEngine.playBetBlip(1.2);
    this.updateLEDDisplays();
    this.showMessage('已重複前次押注', 'info');
  }

  // --- ATTRACT MODE ---

  startAttractMode() {
    if (this.attractTimer) clearInterval(this.attractTimer);
    this.attractTimer = setInterval(() => {
      if (this.state !== 'IDLE') return;
      this.attractStep = (this.attractStep + 1) % RING_SLOTS.length;
      this.highlightSlot(this.attractStep);
    }, 400);
  }

  stopAttractMode() {
    if (this.attractTimer) {
      clearInterval(this.attractTimer);
      this.attractTimer = null;
    }
  }

  highlightSlot(slotIndex, extraClass = '') {
    // Remove active highlight from all
    document.querySelectorAll('.slot-cell.active-light').forEach((el) => {
      el.classList.remove('active-light', 'jackpot-flash');
    });

    const target = document.getElementById(`slot-${slotIndex}`);
    if (target) {
      target.classList.add('active-light');
      if (extraClass) target.classList.add(extraClass);
    }
  }

  // --- SPIN & DECELERATION ENGINE ---

  spin() {
    if (this.state !== 'IDLE' && this.freeSpinsRemaining <= 0) return;
    const totalBet = this.getTotalBet();
    const totalFunds = this.credit + totalBet;

    if (totalFunds <= 0 && this.freeSpinsRemaining <= 0) {
      this.showMessage('無可用金額，請先投幣！', 'warning');
      this.promptCoinSlot();
      if (window.audioEngine) window.audioEngine.playDoubleUpLose();
      return;
    }

    if (totalBet === 0 && this.freeSpinsRemaining <= 0) {
      this.showMessage('請先押注水果再按 START！', 'warning');
      if (window.audioEngine) window.audioEngine.playButtonClick();
      return;
    }

    // Revert temp inserted label immediately if still active
    if (this.insertedTempTimer) {
      clearTimeout(this.insertedTempTimer);
      this.insertedTempTimer = null;
    }
    const labelInserted = document.getElementById('label-top-inserted');
    if (labelInserted) labelInserted.textContent = '玩家餘額 CREDIT';
    const dispInserted = document.getElementById('display-inserted');
    if (dispInserted) dispInserted.textContent = String(this.credit).padStart(4, '0');

    // Clear previous won display & jackpot flash on new spin
    const boxWon = document.getElementById('box-top-won');
    if (boxWon) boxWon.classList.remove('jackpot-flash', 'led-flash');

    document.querySelectorAll('.slot-cell').forEach((el) => {
      el.classList.remove('active-light', 'jackpot-flash', 'gift-awarded-light', 'gift-trigger-pulse');
    });

    this.stopAttractMode();
    this.state = 'SPINNING';
    this.updateControlsState();

    // 1. On press: button click and spin-up sound
    if (window.audioEngine) {
      window.audioEngine.playButtonClick();
      window.audioEngine.playSpinUp();
    }

    // Save previous bets for re-bet button
    this.previousBets = { ...this.currentBets };

    // Select target slot using weighted arcade RNG
    const targetSlotIndex = this.selectWeightedSlot();
    this.runSpinSequence(targetSlotIndex);
  }

  selectWeightedSlot() {
    let totalWeight = 0;
    Object.values(SLOT_WEIGHTS).forEach((w) => (totalWeight += w));

    let rnd = Math.random() * totalWeight;
    for (let i = 0; i < RING_SLOTS.length; i++) {
      rnd -= SLOT_WEIGHTS[i];
      if (rnd <= 0) {
        return i;
      }
    }
    return 0;
  }

  /**
   * Tense deceleration curve with pitch shift
   */
  runSpinSequence(targetSlotIndex) {
    const totalSlots = RING_SLOTS.length;
    // Calculate total steps: 3 full loops + distance to target + dramatic lead-in
    const minLaps = 3;
    const currentPos = this.currentLightIndex;
    const distanceToTarget = (targetSlotIndex - currentPos + totalSlots) % totalSlots;
    const totalSteps = minLaps * totalSlots + distanceToTarget + totalSlots;

    let step = 0;
    const decelThreshold = 24; // last 24 steps for agonizing deceleration

    const executeStep = () => {
      this.currentLightIndex = (this.currentLightIndex + 1) % totalSlots;
      step++;

      const remainingSteps = totalSteps - step;
      let delayMs;
      let speedFactor = 1.0;

      if (step < 10) {
        // 1. Initial Acceleration: 110ms down to 28ms
        delayMs = 110 - step * 8;
        speedFactor = 0.8;
      } else if (remainingSteps > decelThreshold) {
        // 2. High Speed Cruise: 28ms
        delayMs = 28;
        speedFactor = 1.0;
      } else {
        // 3. Tense Deceleration Curve (Exponential Easing)
        const decelProgress = (decelThreshold - remainingSteps) / decelThreshold;
        // Ease-in-cubic curve: delay ramps from 30ms up to 800ms
        delayMs = 30 + Math.pow(decelProgress, 2.7) * 720;
        speedFactor = Math.max(0.05, 1.0 - decelProgress);
      }

      this.highlightSlot(this.currentLightIndex);

      // Play audio tick with pitch modulation matching speed
      if (window.audioEngine) {
        window.audioEngine.playLightStep(speedFactor);
      }

      if (step < totalSteps) {
        setTimeout(executeStep, delayMs);
      } else {
        // Arrived at target slot!
        this.handleSpinLanded(RING_SLOTS[targetSlotIndex]);
      }
    };

    executeStep();
  }

  // --- RESULT EVALUATION ---

  handleSpinLanded(landedSlot) {
    const isSpecial = landedSlot.type === 'special';
    let wonAmount = 0;

    if (isSpecial) {
      this.handleSpecialLanded(landedSlot);
      return;
    }

    // Regular Symbol
    const symKey = landedSlot.symbol;
    const sym = SYMBOLS[symKey];
    const betAmount = this.currentBets[symKey];

    if (betAmount > 0) {
      wonAmount = betAmount * sym.multiplier;
      this.bonusWin += wonAmount;

      if (symKey === 'bar') {
        // BAR JACKPOT: Trigger chained lights & celebration!
        this.triggerBarJackpot(wonAmount);
      } else {
        if (window.audioEngine) window.audioEngine.playStopDing(true);
        this.showMessage(`中獎！${sym.nameZh} ${sym.multiplier}倍！贏得 ${wonAmount}！`, 'success');
        this.transitionToWinDecision();
      }
    } else {
      // Missed! Light landed on a symbol not bet on
      if (window.audioEngine) window.audioEngine.playStopDing(false);
      this.showMessage(`開出 ${sym.nameZh}，可惜未押注`, 'info');
      this.finishRoundNoWin();
    }
  }

  handleSpecialLanded(slot) {
    if (slot.special === 'once_more') {
      // Free Spin
      this.showMessage('【送一次】恭喜獲得免費再來一局！', 'bonus');
      if (window.audioEngine) window.audioEngine.playOnceMoreChime();
      this.highlightSlot(slot.id, 'jackpot-flash');

      setTimeout(() => {
        this.showMessage('免費旋轉啟動！', 'bonus');
        this.freeSpinsRemaining = 1;
        this.spin();
      }, 1800);
      return;
    }

    if (slot.special === 'gift_small' || slot.special === 'gift_medium' || slot.special === 'gift_large') {
      this.triggerGiftLights(slot);
      return;
    }

    if (slot.special === 'x2') {
      const totalBet = this.getTotalBet();
      const bonus = Math.max(10, totalBet * 2);
      this.bonusWin += bonus;
      this.showMessage(`【X2 雙倍送】獲得額外獎勵 ${bonus}！`, 'bonus');
      if (window.audioEngine) window.audioEngine.playStopDing(true);
      this.transitionToWinDecision();
      return;
    }

    if (slot.special === 'x25') {
      const maxBet = Math.max(1, ...Object.values(this.currentBets));
      const bonus = maxBet * 25;
      this.bonusWin += bonus;
      this.showMessage(`【X25 幸運大獎】贏得 ${bonus}！`, 'jackpot');
      if (window.audioEngine) window.audioEngine.playJackpotFanfare();
      this.transitionToWinDecision(true);
      return;
    }

    if (slot.special === 'x50') {
      const maxBet = Math.max(1, ...Object.values(this.currentBets));
      const bonus = maxBet * 50;
      this.bonusWin += bonus;
      this.showMessage(`【X50 大滿貫狂暴巨獎】贏得 ${bonus}！`, 'jackpot');
      if (window.audioEngine) window.audioEngine.playJackpotFanfare();
      this.transitionToWinDecision(true);
      return;
    }
  }

  /**
   * Gift Light (送燈) Prize System:
   * - Small: 2-3 extra lights (cyan/emerald theme)
   * - Medium: 5-6 extra lights (golden amber theme)
   * - Large: 8-10 extra lights, with ~2% chance for full board all-24 lights! (ruby/rainbow theme)
   * - Settles each light as it comes on, updating the top-left won and center win amount immediately
   * - One-by-one sequential lighting animation with ascending rising note sound
   * - Large gift light plays celebratory fanfare and cabinet disco lights
   */
  triggerGiftLights(giftSlot) {
    this.state = 'GIFT_LIGHTS';
    this.updateControlsState();

    const isSmall = giftSlot.special === 'gift_small';
    const isMedium = giftSlot.special === 'gift_medium';
    const isLarge = giftSlot.special === 'gift_large';

    let count = 0;
    let isFullBoard = false;

    if (isSmall) {
      count = Math.floor(Math.random() * 2) + 2; // 2 or 3
      this.showMessage(`★【小送燈觸發】幸運獲得 ${count} 盞加碼送燈！★`, 'bonus');
      if (window.audioEngine) window.audioEngine.playGiftIntroChime();
    } else if (isMedium) {
      count = Math.floor(Math.random() * 2) + 5; // 5 or 6
      this.showMessage(`★★【中送燈爆發】狂送 ${count} 盞加碼送燈！★★`, 'bonus');
      if (window.audioEngine) window.audioEngine.playGiftIntroChime();
    } else if (isLarge) {
      // 2% chance of full board (滿盤全開通殺)
      if (Math.random() < 0.02) {
        isFullBoard = true;
        count = RING_SLOTS.length - 1; // All other 23 slots
        this.showMessage(`★★★★★【狂暴大滿盤！24 燈全亮通殺巨獎！】★★★★★`, 'jackpot');
      } else {
        count = Math.floor(Math.random() * 3) + 8; // 8, 9, or 10
        this.showMessage(`★★★【大送燈震撼觸發】連鎖狂送 ${count} 盞巨獎燈！★★★`, 'jackpot');
      }

      if (window.audioEngine) window.audioEngine.playLargeGiftCelebration();
      const cabinet = document.querySelector('.arcade-cabinet');
      if (cabinet) cabinet.classList.add('jackpot-mode');
    }

    // Highlight the trigger slot with special tier glow
    const triggerEl = document.getElementById(`slot-${giftSlot.id}`);
    if (triggerEl) {
      triggerEl.classList.add('gift-trigger-pulse');
    }

    // Select target slots
    const targetSlotIndices = [];
    if (isFullBoard) {
      // Clockwise traversal of all other 23 slots starting right after the gift slot
      for (let i = 1; i < RING_SLOTS.length; i++) {
        targetSlotIndices.push((giftSlot.id + i) % RING_SLOTS.length);
      }
    } else {
      const candidates = [];
      for (let i = 0; i < RING_SLOTS.length; i++) {
        if (i !== giftSlot.id) candidates.push(i);
      }

      // Shuffle
      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      // Prioritize symbols player bet on, then high multiplier symbols
      candidates.sort((a, b) => {
        const symA = RING_SLOTS[a].symbol;
        const symB = RING_SLOTS[b].symbol;
        const betA = symA ? (this.currentBets[symA] || 0) : 0;
        const betB = symB ? (this.currentBets[symB] || 0) : 0;
        if (betB !== betA) return betB - betA;
        const multA = symA && SYMBOLS[symA] ? SYMBOLS[symA].multiplier : 0;
        const multB = symB && SYMBOLS[symB] ? SYMBOLS[symB].multiplier : 0;
        return multB - multA;
      });

      for (let i = 0; i < count; i++) {
        targetSlotIndices.push(candidates[i]);
      }

      // Sort clockwise from trigger slot for circular lighting motion
      targetSlotIndices.sort((a, b) => {
        const distA = (a - giftSlot.id + RING_SLOTS.length) % RING_SLOTS.length;
        const distB = (b - giftSlot.id + RING_SLOTS.length) % RING_SLOTS.length;
        return distA - distB;
      });
    }

    // Sequentially light up and settle each slot one by one
    let currentStep = 0;
    const stepInterval = isFullBoard ? 160 : 480;

    const awardNext = () => {
      if (currentStep >= targetSlotIndices.length) {
        // Complete sequence!
        setTimeout(() => {
          const cabinet = document.querySelector('.arcade-cabinet');
          if (cabinet) cabinet.classList.remove('jackpot-mode');
          if (triggerEl) triggerEl.classList.remove('gift-trigger-pulse');
          this.transitionToWinDecision(isLarge || isFullBoard);
        }, 1200);
        return;
      }

      const slotIdx = targetSlotIndices[currentStep];
      const targetSlot = RING_SLOTS[slotIdx];
      const targetEl = document.getElementById(`slot-${targetSlot.id}`);

      if (targetEl) {
        targetEl.classList.add('active-light', 'gift-awarded-light');
      }

      let award = 0;
      let symName = targetSlot.label;

      if (targetSlot.type === 'symbol') {
        const sym = SYMBOLS[targetSlot.symbol];
        symName = sym.nameZh;
        const bet = this.currentBets[targetSlot.symbol] || 0;
        if (bet > 0) {
          award = bet * sym.multiplier;
        } else {
          // Gifting base multiplier even if not bet on!
          award = sym.multiplier;
        }
      } else {
        // Special slot hit during gift run
        award = 20;
      }

      this.bonusWin += award;

      // Real-time settlement: update top-left won & all LED displays
      this.updateLEDDisplays();
      const topWonBox = document.getElementById('box-top-won');
      if (topWonBox) {
        topWonBox.classList.remove('led-flash');
        void topWonBox.offsetWidth;
        topWonBox.classList.add('led-flash');
      }

      // Procedural rising note audio
      if (window.audioEngine) {
        window.audioEngine.playRisingGiftNote(currentStep, targetSlotIndices.length);
      }

      this.showMessage(
        `【送燈第 ${currentStep + 1}/${count} 盞】${symName}！獲得 +${award}！累計得分: ${this.bonusWin.toLocaleString()}`,
        'bonus'
      );

      currentStep++;
      setTimeout(awardNext, stepInterval);
    };

    setTimeout(awardNext, 600);
  }

  /**
   * BAR Jackpot: Chains 2-3 extra bonus lights across the board
   */
  triggerBarJackpot(initialWin) {
    this.showMessage(`★★★ BAR 大滿貫頭獎！觸發跑火車連鎖送燈！ ★★★`, 'jackpot');
    if (window.audioEngine) window.audioEngine.playJackpotFanfare();

    // Rainbow disco lights on cabinet
    const cabinet = document.querySelector('.arcade-cabinet');
    if (cabinet) cabinet.classList.add('jackpot-mode');

    // Chained lights sequence: picks 2 additional fruit slots
    const chainedSlots = [
      (this.currentLightIndex + 7) % RING_SLOTS.length,
      (this.currentLightIndex + 14) % RING_SLOTS.length
    ];

    setTimeout(() => {
      let chainIdx = 0;
      const chainInterval = setInterval(() => {
        if (chainIdx >= chainedSlots.length) {
          clearInterval(chainInterval);
          if (cabinet) cabinet.classList.remove('jackpot-mode');
          this.transitionToWinDecision(true);
          return;
        }

        const slot = RING_SLOTS[chainedSlots[chainIdx]];
        const targetEl = document.getElementById(`slot-${slot.id}`);
        if (targetEl) targetEl.classList.add('jackpot-flash');

        if (slot.type === 'symbol') {
          const sym = SYMBOLS[slot.symbol];
          const chainReward = Math.max(5, (this.currentBets[slot.symbol] || 1) * sym.multiplier);
          this.bonusWin += chainReward;
          this.showMessage(`連鎖送燈！${sym.nameZh} 額外獎勵 +${chainReward}！`, 'bonus');
          if (window.audioEngine) window.audioEngine.playStopDing(true);
        }

        this.updateLEDDisplays();
        chainIdx++;
      }, 1200);
    }, 1500);
  }

  transitionToWinDecision(isJackpot = false) {
    this.state = 'WIN_DECISION';
    this.freeSpinsRemaining = 0;

    const boxWon = document.getElementById('box-top-won');
    if (boxWon) {
      boxWon.classList.remove('led-flash');
      void boxWon.offsetWidth;
      boxWon.classList.add('led-flash');
      if (isJackpot || this.bonusWin >= 200) {
        boxWon.classList.add('jackpot-flash');
      }
    }

    this.animateScoreCountUp(this.bonusWin);
    this.updateControlsState();

    if (isJackpot) {
      this.showMessage(`★ 巨額大獎 NT$${this.bonusWin}！可按【💰 取得】或挑戰【🎲 比倍】！★`, 'jackpot');
    } else {
      this.showMessage(`贏得 NT$${this.bonusWin}！可按【💰 取得】收分，或按【🎲 比倍】挑戰翻倍！`, 'success');
    }
  }

  animateScoreCountUp(targetWin) {
    if (this.scoreCountUpInterval) {
      clearInterval(this.scoreCountUpInterval);
      this.scoreCountUpInterval = null;
    }

    const topWonEl = document.getElementById('display-won');
    const winEl = document.getElementById('display-win');
    if (!topWonEl && !winEl) return;

    let current = 0;
    const steps = Math.min(15, Math.max(1, targetWin));
    const stepVal = Math.max(1, Math.floor(targetWin / steps));

    this.scoreCountUpInterval = setInterval(() => {
      current = Math.min(targetWin, current + stepVal);
      if (topWonEl) topWonEl.textContent = String(current).padStart(4, '0');
      if (winEl) winEl.textContent = String(current).padStart(4, '0');

      if (current >= targetWin) {
        clearInterval(this.scoreCountUpInterval);
        this.scoreCountUpInterval = null;
        if (topWonEl) topWonEl.textContent = String(targetWin).padStart(4, '0');
        if (winEl) winEl.textContent = String(targetWin).padStart(4, '0');
      }
    }, 30);
  }

  finishRound(clearBets = true) {
    if (this.scoreCountUpInterval) {
      clearInterval(this.scoreCountUpInterval);
      this.scoreCountUpInterval = null;
    }
    if (this.raiseAnimInterval) {
      clearInterval(this.raiseAnimInterval);
      this.raiseAnimInterval = null;
    }
    if (this.doubleUpTimer) {
      clearTimeout(this.doubleUpTimer);
      this.doubleUpTimer = null;
    }
    if (this.safeguardTimer) {
      clearTimeout(this.safeguardTimer);
      this.safeguardTimer = null;
    }

    this.state = 'IDLE';
    this.freeSpinsRemaining = 0;
    this.doubleUpStake = 0;
    this.doubleUpRound = 1;
    if (clearBets) {
      Object.keys(this.currentBets).forEach((k) => (this.currentBets[k] = 0));
    }
    const boxWon = document.getElementById('box-top-won');
    if (boxWon) boxWon.classList.remove('jackpot-flash', 'led-flash');

    const centerMid = document.getElementById('center-mid-section');
    if (centerMid) centerMid.classList.remove('in-double-up-mode');
    const mascotBox = document.getElementById('mascot-art-box');
    const doubleUpPanel = document.getElementById('double-up-panel');
    if (mascotBox) mascotBox.style.display = 'flex';
    if (doubleUpPanel) doubleUpPanel.style.display = 'none';

    const duCard = document.getElementById('du-card');
    if (duCard) duCard.className = 'du-card';

    this.updateLEDDisplays();
    this.startAttractMode();
  }

  finishRoundNoWin() {
    this.finishRound(true);
  }

  // --- 4. DOUBLE-UP (HIGHER / LOWER) ENGINE ---

  enterDoubleUp() {
    if (this.bonusWin <= 0 && this.doubleUpStake <= 0) return;
    if (this.state === 'SPINNING' || this.state === 'PAYING_OUT' || this.state === 'COLLECTING') return;

    if (this.scoreCountUpInterval) {
      clearInterval(this.scoreCountUpInterval);
      this.scoreCountUpInterval = null;
    }
    if (this.raiseAnimInterval) {
      clearInterval(this.raiseAnimInterval);
      this.raiseAnimInterval = null;
    }
    if (this.doubleUpTimer) {
      clearTimeout(this.doubleUpTimer);
      this.doubleUpTimer = null;
    }
    if (this.safeguardTimer) {
      clearTimeout(this.safeguardTimer);
      this.safeguardTimer = null;
    }

    if (this.bonusWin > 0) {
      this.doubleUpStake = this.bonusWin;
    }
    this.bonusWin = this.doubleUpStake;
    this.doubleUpRound = 1;
    this.state = 'DOUBLE_UP_READY';

    // Reset card UI
    const duCard = document.getElementById('du-card');
    if (duCard) duCard.className = 'du-card';

    const cornerEl = document.getElementById('du-card-corner');
    const valEl = document.getElementById('du-card-val');
    const typeEl = document.getElementById('du-card-type');
    if (cornerEl) cornerEl.textContent = '?';
    if (valEl) valEl.textContent = '?';
    if (typeEl) {
      typeEl.textContent = '等待選擇';
      typeEl.className = 'card-label-tag';
    }

    // Show double-up arena in center, hide mascot
    const centerMid = document.getElementById('center-mid-section');
    if (centerMid) centerMid.classList.add('in-double-up-mode');
    const mascotBox = document.getElementById('mascot-art-box');
    const doubleUpPanel = document.getElementById('double-up-panel');
    if (mascotBox) mascotBox.style.display = 'none';
    if (doubleUpPanel) doubleUpPanel.style.display = 'flex';

    if (window.audioEngine) window.audioEngine.playButtonClick();

    this.updateDoubleUpUI();
    this.updateLEDDisplays();
    this.updateControlsState();
    this.showMessage(`★ 比倍第 ${this.doubleUpRound} 關 ★ 押分: ${this.doubleUpStake.toLocaleString()}！可按【餘額加注】、【小/大】或【💰 收分】`, 'info');
  }

  updateDoubleUpUI() {
    const stakeEl = document.getElementById('du-stake-val');
    const balanceEl = document.getElementById('du-balance-val');
    const roundEl = document.getElementById('du-round-badge');
    if (stakeEl) stakeEl.textContent = this.doubleUpStake.toLocaleString();
    if (balanceEl) balanceEl.textContent = this.credit.toLocaleString();
    if (roundEl) roundEl.textContent = `第 ${this.doubleUpRound} 關`;
  }

  /**
   * Smooth synchronized number interpolation for balance-to-stake transfer
   */
  animateRaiseTransfer(startCredit, targetCredit, startStake, targetStake) {
    if (this.raiseAnimInterval) {
      clearInterval(this.raiseAnimInterval);
      this.raiseAnimInterval = null;
    }

    const duStakeVal = document.getElementById('du-stake-val');
    const duBalanceVal = document.getElementById('du-balance-val');
    const dispWon = document.getElementById('display-won');
    const dispCredit = document.getElementById('display-credit');
    const dispInserted = document.getElementById('display-inserted');
    const dispWin = document.getElementById('display-win');

    const totalSteps = 8;
    let step = 0;

    this.raiseAnimInterval = setInterval(() => {
      step++;
      const progress = Math.min(1, step / totalSteps);
      const curCredit = Math.round(startCredit + (targetCredit - startCredit) * progress);
      const curStake = Math.round(startStake + (targetStake - startStake) * progress);

      if (duStakeVal) duStakeVal.textContent = curStake.toLocaleString();
      if (duBalanceVal) duBalanceVal.textContent = curCredit.toLocaleString();
      if (dispWon) dispWon.textContent = String(curStake).padStart(4, '0');
      if (dispWin) dispWin.textContent = String(curStake).padStart(4, '0');
      if (dispCredit) dispCredit.textContent = String(curCredit).padStart(4, '0');
      if (dispInserted) dispInserted.textContent = String(curCredit).padStart(4, '0');

      if (step >= totalSteps) {
        clearInterval(this.raiseAnimInterval);
        this.raiseAnimInterval = null;
        if (duStakeVal) duStakeVal.textContent = targetStake.toLocaleString();
        if (duBalanceVal) duBalanceVal.textContent = targetCredit.toLocaleString();
        if (dispWon) dispWon.textContent = String(targetStake).padStart(4, '0');
        if (dispWin) dispWin.textContent = String(targetStake).padStart(4, '0');
        if (dispCredit) dispCredit.textContent = String(targetCredit).padStart(4, '0');
        if (dispInserted) dispInserted.textContent = String(targetCredit).padStart(4, '0');
      }
    }, 25);
  }

  /**
   * Raise stake using player balance (CREDIT):
   * Options: 1, 10, 'half', 'all'
   * - Immediately reduces this.credit and increases this.doubleUpStake
   * - Shows synchronized count animations
   * - Allowed before each Big/Small pick, repeatable
   * - Greyed out when balance is insufficient or 0
   */
  raiseStakeFromBalance(type) {
    if (this.state !== 'DOUBLE_UP_READY') return;
    if (this.credit <= 0) {
      this.showMessage('CREDIT 餘額不足，無法加注！', 'warning');
      this.promptCoinSlot();
      return;
    }
    if (this.doubleUpStake >= this.stakeCap) {
      this.showMessage(`已達押分上限 (${this.stakeCap.toLocaleString()})！`, 'warning');
      return;
    }

    let desiredAdd = 0;
    if (type === 1 || type === '1') {
      desiredAdd = 1;
    } else if (type === 10 || type === '10') {
      desiredAdd = 10;
    } else if (type === 'half') {
      desiredAdd = Math.max(1, Math.floor(this.credit / 2));
    } else if (type === 'all') {
      desiredAdd = this.credit;
    } else if (typeof type === 'number') {
      desiredAdd = Math.floor(type);
    }

    if (desiredAdd <= 0 || this.credit < desiredAdd) {
      this.showMessage('CREDIT 餘額不足！', 'warning');
      return;
    }

    const maxAllowed = this.stakeCap - this.doubleUpStake;
    const actualAdd = Math.min(desiredAdd, maxAllowed);
    if (actualAdd <= 0) {
      this.showMessage(`已達押分上限 (${this.stakeCap.toLocaleString()})！`, 'warning');
      return;
    }

    const startCredit = this.credit;
    const startStake = this.doubleUpStake;

    // Immediately update core model state
    this.credit -= actualAdd;
    this.doubleUpStake += actualAdd;
    this.bonusWin = this.doubleUpStake;

    // Rising pitch sound effect
    if (window.audioEngine) {
      const pitchRatio = type === 'all' ? 1.6 : (type === 'half' ? 1.4 : (type === 10 ? 1.25 : 1.15));
      window.audioEngine.playBetBlip(pitchRatio);
    }

    // Visual pulse effect
    const stakeMeter = document.querySelector('.du-stake-meter');
    const balanceMeter = document.querySelector('.du-balance-meter');
    if (stakeMeter) {
      stakeMeter.classList.remove('pulse-stake-add');
      void stakeMeter.offsetWidth;
      stakeMeter.classList.add('pulse-stake-add');
      setTimeout(() => stakeMeter.classList.remove('pulse-stake-add'), 350);
    }
    if (balanceMeter) {
      balanceMeter.classList.remove('pulse-balance-sub');
      void balanceMeter.offsetWidth;
      balanceMeter.classList.add('pulse-balance-sub');
      setTimeout(() => balanceMeter.classList.remove('pulse-balance-sub'), 350);
    }

    // Run synchronized count animation
    this.animateRaiseTransfer(startCredit, this.credit, startStake, this.doubleUpStake);

    // Update controls state (disable buttons if balance is now too low)
    this.updateControlsState();

    const descMap = { 1: '+1', 10: '+10', half: '半額加注', all: '全額加注' };
    const label = descMap[type] || `+${actualAdd}`;
    this.showMessage(`【${label}】自餘額加注 +${actualAdd}！目前押分: ${this.doubleUpStake.toLocaleString()}，剩餘餘額: ${this.credit.toLocaleString()}`, 'info');
  }

  // Alias methods for compatibility
  raiseStake(amount = 10) {
    this.raiseStakeFromBalance(amount);
  }

  raiseHalf() {
    this.raiseStakeFromBalance('half');
  }

  raiseAll() {
    this.raiseStakeFromBalance('all');
  }

  /**
   * Pick and Reveal: Choose Big or Small, tense drumroll & card-flip
   * Safeguard timer guarantees state evaluation never hangs or freezes the UI!
   */
  pickDoubleUp(choice) {
    if (this.state !== 'DOUBLE_UP_READY' || this.doubleUpStake <= 0) return;

    if (this.doubleUpTimer) {
      clearTimeout(this.doubleUpTimer);
      this.doubleUpTimer = null;
    }
    if (this.safeguardTimer) {
      clearTimeout(this.safeguardTimer);
      this.safeguardTimer = null;
    }

    this.state = 'DOUBLE_UP_REVEALING';
    this.updateControlsState();

    const duCard = document.getElementById('du-card');
    if (duCard) {
      duCard.className = 'du-card rolling-drumroll';
    }
    const typeEl = document.getElementById('du-card-type');
    if (typeEl) {
      typeEl.textContent = '開獎中...';
      typeEl.className = 'card-label-tag';
    }

    // Play tense drumroll sound
    if (window.audioEngine) {
      window.audioEngine.playDrumroll(1.1);
    }

    // Normal reveal timer
    this.doubleUpTimer = setTimeout(() => {
      this.evaluateDoubleUpResult(choice);
    }, 1100);

    // Fail-safe safeguard timer: guarantees completion even if timers/audio encounter delay
    this.safeguardTimer = setTimeout(() => {
      if (this.state === 'DOUBLE_UP_REVEALING') {
        console.warn('Double-Up safeguard timer triggered to prevent freeze');
        this.evaluateDoubleUpResult(choice);
      }
    }, 2500);
  }

  evaluateDoubleUpResult(choice) {
    if (this.doubleUpTimer) {
      clearTimeout(this.doubleUpTimer);
      this.doubleUpTimer = null;
    }
    if (this.safeguardTimer) {
      clearTimeout(this.safeguardTimer);
      this.safeguardTimer = null;
    }

    if (this.state !== 'DOUBLE_UP_REVEALING') return;

    try {
      // Pick random result 1..13 (symmetric: 1-6 Small, 7 Tie, 8-13 Big)
      const resultNumber = Math.floor(Math.random() * 13) + 1;

      // Card flip animation & snap sound
      const duCard = document.getElementById('du-card');
      if (duCard) {
        duCard.className = 'du-card flipped';
      }
      if (window.audioEngine) {
        window.audioEngine.playCardFlip();
      }

      // Update card face text
      const cornerEl = document.getElementById('du-card-corner');
      const valEl = document.getElementById('du-card-val');
      const typeEl = document.getElementById('du-card-type');
      if (cornerEl) cornerEl.textContent = resultNumber;
      if (valEl) valEl.textContent = resultNumber;

      const isTie = resultNumber === 7;
      const isSmall = resultNumber >= 1 && resultNumber <= 6;
      const isBig = resultNumber >= 8 && resultNumber <= 13;

      if (typeEl) {
        if (isTie) {
          typeEl.textContent = '平手 TIE (7)';
          typeEl.className = 'card-label-tag tie-tag';
        } else if (isSmall) {
          typeEl.textContent = '小 SMALL (1-6)';
          typeEl.className = 'card-label-tag small-tag';
        } else {
          typeEl.textContent = '大 BIG (8-13)';
          typeEl.className = 'card-label-tag big-tag';
        }
      }

      // 1. TIE: stake is unchanged and the round is replayed
      if (isTie) {
        if (window.audioEngine) window.audioEngine.playTieChime();
        this.showMessage(`【7 平手 TIE】開出 7，押分不變，本關重來！可繼續加注、猜小/大或收分`, 'bonus');

        this.doubleUpTimer = setTimeout(() => {
          if (duCard) duCard.className = 'du-card';
          if (typeEl) {
            typeEl.textContent = '請重新選擇';
            typeEl.className = 'card-label-tag';
          }
          if (valEl) valEl.textContent = '?';
          if (cornerEl) cornerEl.textContent = '?';
          this.state = 'DOUBLE_UP_READY';
          this.updateDoubleUpUI();
          this.updateLEDDisplays();
          this.updateControlsState();
        }, 1300);
        return;
      }

      const won = (choice === 'small' && isSmall) || (choice === 'big' && isBig);

      // 2. CORRECT: stake doubles (x2)
      if (won) {
        this.doubleUpStake *= 2;
        this.bonusWin = this.doubleUpStake;
        if (window.audioEngine) window.audioEngine.playDoubleUpWin();

        const cabinet = document.querySelector('.arcade-cabinet');
        if (cabinet) {
          cabinet.classList.add('jackpot-mode');
          setTimeout(() => cabinet.classList.remove('jackpot-mode'), 1200);
        }

        this.updateDoubleUpUI();
        this.updateLEDDisplays();
        const boxWon = document.getElementById('box-top-won');
        if (boxWon) {
          boxWon.classList.remove('led-flash');
          void boxWon.offsetWidth;
          boxWon.classList.add('led-flash');
        }
        this.showMessage(`恭喜猜中！開出【${resultNumber}】！押分翻倍為 NT$${this.doubleUpStake.toLocaleString()}！`, 'success');

        // Check Limits: stake cap reached
        if (this.doubleUpStake >= this.stakeCap) {
          setTimeout(() => {
            this.showMessage(`★ 已達比倍極限 (${this.doubleUpStake.toLocaleString()} 分)！自動收分入玩家餘額！★`, 'jackpot');
            this.bonusWin = this.doubleUpStake;
            this.doubleUpStake = 0;
            if (window.audioEngine) window.audioEngine.playJackpotFanfare();
            this.collectWin();
          }, 1400);
        } else {
          // Rule 5: Correct guess: whole stake x2, return to choice screen where player can raise again or "Collect"
          this.state = 'DOUBLE_UP_WON';
          this.updateControlsState();

          this.doubleUpTimer = setTimeout(() => {
            if (this.state !== 'DOUBLE_UP_WON') return;
            this.doubleUpRound++;
            this.state = 'DOUBLE_UP_READY';

            if (duCard) duCard.className = 'du-card';
            if (cornerEl) cornerEl.textContent = '?';
            if (valEl) valEl.textContent = '?';
            if (typeEl) {
              typeEl.textContent = '等待選擇';
              typeEl.className = 'card-label-tag';
            }

            this.updateDoubleUpUI();
            this.updateLEDDisplays();
            this.updateControlsState();
            this.showMessage(`★ 比倍第 ${this.doubleUpRound} 關 ★ 押分: ${this.doubleUpStake.toLocaleString()}！可按【餘額加注】、【小/大】或【💰 收分】`, 'info');
          }, 1300);
        }
      } else {
        // 3. WRONG: stake lost, dimmed lights, low thud, returns to betting state
        if (window.audioEngine) window.audioEngine.playWrongThud();

        const cabinet = document.querySelector('.arcade-cabinet');
        if (cabinet) cabinet.classList.add('cabinet-dimmed');

        this.showMessage(`猜錯了！開出【${resultNumber}】，押分歸零！`, 'warning');
        this.doubleUpStake = 0;
        this.bonusWin = 0;
        this.updateLEDDisplays();

        setTimeout(() => {
          if (cabinet) cabinet.classList.remove('cabinet-dimmed');
          if (duCard) duCard.className = 'du-card';
          this.finishRoundNoWin();
        }, 1500);
      }
    } catch (err) {
      console.error('Error during evaluateDoubleUpResult:', err);
      // Fail-safe recovery
      this.state = 'DOUBLE_UP_READY';
      this.updateControlsState();
    }
  }

  continueDoubleUp() {
    if (this.state !== 'DOUBLE_UP_WON') return;
    if (this.doubleUpTimer) {
      clearTimeout(this.doubleUpTimer);
      this.doubleUpTimer = null;
    }

    this.doubleUpRound++;
    this.state = 'DOUBLE_UP_READY';

    const duCard = document.getElementById('du-card');
    if (duCard) duCard.className = 'du-card';

    const cornerEl = document.getElementById('du-card-corner');
    const valEl = document.getElementById('du-card-val');
    const typeEl = document.getElementById('du-card-type');
    if (cornerEl) cornerEl.textContent = '?';
    if (valEl) valEl.textContent = '?';
    if (typeEl) {
      typeEl.textContent = '等待選擇';
      typeEl.className = 'card-label-tag';
    }

    if (window.audioEngine) window.audioEngine.playButtonClick();
    this.updateDoubleUpUI();
    this.updateLEDDisplays();
    this.updateControlsState();
    this.showMessage(`進入第 ${this.doubleUpRound} 關！押分: ${this.doubleUpStake.toLocaleString()}，可加注、猜小/大或收分`, 'info');
  }

  collectDoubleUp() {
    if (this.doubleUpStake <= 0 && this.bonusWin <= 0) return;
    if (this.doubleUpTimer) {
      clearTimeout(this.doubleUpTimer);
      this.doubleUpTimer = null;
    }
    if (this.safeguardTimer) {
      clearTimeout(this.safeguardTimer);
      this.safeguardTimer = null;
    }
    if (this.raiseAnimInterval) {
      clearInterval(this.raiseAnimInterval);
      this.raiseAnimInterval = null;
    }

    if (this.doubleUpStake > 0) {
      this.bonusWin = this.doubleUpStake;
      this.doubleUpStake = 0;
    }

    const duCard = document.getElementById('du-card');
    if (duCard) duCard.className = 'du-card';

    this.collectWin();
  }

  // --- 2. COIN OUT BUTTON: SINGLE-CLICK PAYOUT ---

  /**
   * 2. COIN OUT Button Rules:
   * - This round has a win (this.bonusWin > 0): pay out ONLY this round's prize, do NOT touch credit.
   *   The win amount counts down to 0 with each coin.
   * - No win (this.bonusWin <= 0): pay out unstaked player balance (this.credit), counting down to 0 with each coin.
   *   Staked amounts are not paid out; only the unstaked balance is.
   * - Single click, no holding, no confirmation dialog; temporarily greys out button during payout.
   * - Disabled while spinning and during double-up.
   */
  handleCoinOut() {
    if (this.state === 'SPINNING' || this.state.startsWith('DOUBLE_UP') || this.state === 'PAYING_OUT' || this.state === 'COLLECTING') {
      return;
    }

    if (this.scoreCountUpInterval) {
      clearInterval(this.scoreCountUpInterval);
      this.scoreCountUpInterval = null;
    }

    const isPayingWin = this.bonusWin > 0;
    const payoutAmount = isPayingWin ? this.bonusWin : this.credit;

    if (payoutAmount <= 0) {
      this.showMessage('無可用分數可退幣', 'info');
      return;
    }

    this.state = 'PAYING_OUT';
    this.updateControlsState(); // Greys out button immediately

    const isJackpot = payoutAmount >= 40;
    if (isPayingWin) {
      this.showMessage(`【退幣中】吐出本局得分 ${payoutAmount} 枚硬幣（玩家餘額保留）！`, 'info');
    } else {
      this.showMessage(`【退幣中】吐出玩家餘額 ${payoutAmount} 枚硬幣！`, 'info');
    }

    if (window.coinTray) {
      window.coinTray.startPayout(
        payoutAmount,
        (remaining, dropped) => {
          if (isPayingWin) {
            this.bonusWin = remaining;
          } else {
            this.credit = remaining;
          }
          this.pocketBank += dropped;
          this.updateLEDDisplays();
          const trayCountEl = document.getElementById('tray-coin-count');
          if (trayCountEl) trayCountEl.textContent = window.coinTray.totalTrayCoins;
        },
        () => {
          if (isPayingWin) {
            this.bonusWin = 0;
            this.showMessage(`本局得分退幣完成！共 ${payoutAmount} 枚硬幣已落入取幣槽，玩家餘額保留！`, 'success');
            this.finishRound(true);
          } else {
            this.credit = 0;
            this.showMessage(`餘額退幣完成！共 ${payoutAmount} 枚硬幣已落入取幣槽！`, 'success');
            this.finishRound(false); // Staked bets preserved
          }
          this.state = 'IDLE';
          this.updateLEDDisplays();
        },
        isJackpot
      );
    } else {
      if (isPayingWin) {
        this.bonusWin = 0;
        this.finishRound(true);
      } else {
        this.credit = 0;
        this.finishRound(false);
      }
      this.state = 'IDLE';
      this.updateLEDDisplays();
    }
  }

  coinOutAllCredit() {
    this.handleCoinOut();
  }

  payoutToTray() {
    this.handleCoinOut();
  }

  // --- WIN COLLECTION INTO CREDIT ---

  /**
   * Collect Win into Credit: animated step-by-step score transfer into player credit/balance
   */
  collectWin() {
    if (this.bonusWin <= 0 && this.doubleUpStake <= 0) return;

    if (this.scoreCountUpInterval) {
      clearInterval(this.scoreCountUpInterval);
      this.scoreCountUpInterval = null;
    }

    if (this.doubleUpStake > 0) {
      this.bonusWin = this.doubleUpStake;
      this.doubleUpStake = 0;
    }

    const transferAmount = this.bonusWin;
    this.state = 'COLLECTING';
    this.updateControlsState();

    const boxInserted = document.getElementById('box-top-inserted');
    const boxWon = document.getElementById('box-top-won');
    if (boxInserted) boxInserted.classList.add('led-flash');
    if (boxWon) boxWon.classList.add('led-flash');

    // Fast step-by-step transfer
    const steps = Math.min(20, Math.max(1, transferAmount));
    const stepVal = Math.max(1, Math.floor(transferAmount / steps));
    let transferred = 0;

    const interval = setInterval(() => {
      const chunk = Math.min(this.bonusWin, stepVal);
      this.bonusWin -= chunk;
      this.credit += chunk;
      transferred += chunk;

      if (window.audioEngine) {
        window.audioEngine.playCreditTick(Math.min(10, Math.floor(transferred / 5)));
      }

      this.updateLEDDisplays();

      if (this.bonusWin <= 0 || transferred >= transferAmount) {
        clearInterval(interval);
        this.credit += this.bonusWin;
        this.bonusWin = 0;
        this.updateLEDDisplays();
        if (boxInserted) boxInserted.classList.remove('led-flash');
        if (boxWon) boxWon.classList.remove('led-flash');
        this.showMessage(`已成功取得 NT$${transferAmount} 進入玩家餘額！可繼續押注或退幣`, 'success');
        this.finishRound(true);
      }
    }, 45);
  }

  // --- MESSAGE TICKER ---

  showMessage(msg, type = 'info') {
    const ticker = document.getElementById('arcade-marquee-ticker');
    if (!ticker) return;

    ticker.textContent = msg;
    ticker.className = `marquee-ticker ${type}`;
  }
}

// Global Game Singleton
window.littleMary = new LittleMaryGame();
