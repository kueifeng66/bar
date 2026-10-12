/**
 * Little Mary Retro Arcade - Coin Physics Engine & Tray Simulation
 * Features:
 * - 2D Canvas physics: gravity, friction, bounce restitution, angular momentum
 * - Realistic gold arcade token rendering with rim ridges & star/M emblem
 * - Payout chute drop animation with synchronized score count-down
 * - High-multiplier Jackpot Fountain explosion
 * - Coin insertion flight animation with cabinet shake feedback
 */

class CoinPhysicsTray {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.coins = [];
    this.sparks = [];
    this.isRunning = true;
    this.payoutQueue = 0;
    this.isPayingOut = false;
    this.totalTrayCoins = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.coinSprite = null;
    this.loadCoinImage();
    this.initDragEvents();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  loadCoinImage() {
    const img = new Image();
    img.src = 'assets/coin10_raw.png';
    img.onload = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = 300;
      offscreen.height = 300;
      const offCtx = offscreen.getContext('2d');
      offCtx.beginPath();
      // Clip to circular coin (removing outer dark corners)
      offCtx.arc(150, 149, 144, 0, Math.PI * 2);
      offCtx.clip();
      offCtx.drawImage(img, 0, 0, 300, 298);

      // Smooth outer silver rim edge
      offCtx.beginPath();
      offCtx.arc(150, 149, 143, 0, Math.PI * 2);
      offCtx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      offCtx.lineWidth = 3;
      offCtx.stroke();

      this.coinSprite = offscreen;
      try {
        window.coin10SpriteUrl = offscreen.toDataURL();
      } catch (e) {}
    };
  }

  /**
   * Initialize Pointer Drag and Tap events on tray canvas:
   * 1. Tap: scoops up coins and flies offscreen with rattle sound.
   * 2. Drag: drag coin back into coin slot to re-insert and play!
   */
  initDragEvents() {
    let isDragging = false;
    let dragEl = null;
    let startX = 0;
    let startY = 0;

    const onPointerDown = (e) => {
      if (this.totalTrayCoins <= 0) return;
      startX = e.clientX;
      startY = e.clientY;
      isDragging = false;

      const onPointerMove = (moveEvt) => {
        const dx = moveEvt.clientX - startX;
        const dy = moveEvt.clientY - startY;
        if (!isDragging && Math.hypot(dx, dy) > 8) {
          isDragging = true;
          dragEl = document.createElement('div');
          dragEl.className = 'dragging-coin-avatar';
          dragEl.style.left = `${moveEvt.clientX}px`;
          dragEl.style.top = `${moveEvt.clientY}px`;
          document.body.appendChild(dragEl);
        }
        if (isDragging && dragEl) {
          dragEl.style.left = `${moveEvt.clientX}px`;
          dragEl.style.top = `${moveEvt.clientY}px`;

          const slotEl = document.getElementById('metal-coin-slot');
          if (slotEl) {
            const slotRect = slotEl.getBoundingClientRect();
            const isOver = (
              moveEvt.clientX >= slotRect.left - 20 &&
              moveEvt.clientX <= slotRect.right + 20 &&
              moveEvt.clientY >= slotRect.top - 20 &&
              moveEvt.clientY <= slotRect.bottom + 20
            );
            slotEl.classList.toggle('slot-drag-hover', isOver);
          }
        }
      };

      const onPointerUp = (upEvt) => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);

        const slotEl = document.getElementById('metal-coin-slot');
        if (slotEl) slotEl.classList.remove('slot-drag-hover');

        if (isDragging && dragEl) {
          let droppedInSlot = false;
          if (slotEl) {
            const slotRect = slotEl.getBoundingClientRect();
            if (
              upEvt.clientX >= slotRect.left - 30 &&
              upEvt.clientX <= slotRect.right + 30 &&
              upEvt.clientY >= slotRect.top - 30 &&
              upEvt.clientY <= slotRect.bottom + 30
            ) {
              droppedInSlot = true;
            }
          }

          if (dragEl.parentNode) dragEl.parentNode.removeChild(dragEl);
          dragEl = null;

          if (droppedInSlot) {
            this.removeOneCoin();
            const trayCountEl = document.getElementById('tray-coin-count');
            if (trayCountEl) trayCountEl.textContent = this.totalTrayCoins;

            if (window.littleMary) {
              window.littleMary.registerCoinInserted(10);
            }

            triggerCoinInsertionAnimation(
              'metal-coin-slot',
              'arcade-cabinet',
              (step) => {
                if (window.littleMary) {
                  window.littleMary.credit += step;
                  window.littleMary.updateLEDDisplays();
                }
              },
              () => {
                if (window.littleMary) {
                  window.littleMary.showMessage('拖曳硬幣投幣成功！+NT$10 (CREDIT +10)', 'success');
                }
              }
            );
          }
        } else {
          // Tap: take coins off-screen with rattle sound
          const scooped = this.takeCoins();
          if (scooped > 0) {
            const bankDisplay = document.getElementById('pocket-bank-display');
            if (bankDisplay) {
              const currentBank = parseInt(bankDisplay.textContent, 10) || 0;
              bankDisplay.textContent = currentBank + scooped;
            }
            const trayCountEl = document.getElementById('tray-coin-count');
            if (trayCountEl) trayCountEl.textContent = '0';
            if (window.littleMary) {
              window.littleMary.showMessage(`已將 ${scooped} 枚硬幣收進口袋！`, 'success');
            }
          }
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    };

    this.canvas.addEventListener('pointerdown', onPointerDown);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || this.canvas.parentElement?.clientWidth || 400;
    const h = rect.height || this.canvas.parentElement?.clientHeight || 100;
    this.width = this.canvas.width = w * (window.devicePixelRatio || 1);
    this.height = this.canvas.height = h * (window.devicePixelRatio || 1);
    this.scale = window.devicePixelRatio || 1;
    this.gravity = 0.55 * this.scale;
    this.floorY = this.height - (14 * this.scale);
  }

  /**
   * Reset or scoop up all coins in tray:
   * Spawns flying coins animation offscreen, plays rattle sound
   */
  takeCoins() {
    const count = this.totalTrayCoins;
    if (count <= 0) return 0;

    // Play rattle sound
    if (window.audioEngine) {
      window.audioEngine.playCoinRattle();
    }

    // Spawn visual flying coins flying off-screen to pocket
    const rect = this.canvas.getBoundingClientRect();
    const spawnNum = Math.min(18, count);
    for (let i = 0; i < spawnNum; i++) {
      const flyEl = document.createElement('div');
      flyEl.className = 'flying-coin-inserted';
      flyEl.style.left = `${rect.left + rect.width / 2 + (Math.random() - 0.5) * 80}px`;
      flyEl.style.top = `${rect.top + rect.height / 2 + (Math.random() - 0.5) * 30}px`;
      flyEl.style.transition = 'transform 0.6s cubic-bezier(0.1, 0.9, 0.2, 1), opacity 0.6s';
      document.body.appendChild(flyEl);

      const destX = 30 + Math.random() * 80;
      const destY = -60 - Math.random() * 40;
      requestAnimationFrame(() => {
        flyEl.style.transform = `translate(${destX - parseFloat(flyEl.style.left)}px, ${destY - parseFloat(flyEl.style.top)}px) scale(0.3) rotate(${Math.random() * 360}deg)`;
        flyEl.style.opacity = '0';
      });

      setTimeout(() => {
        if (flyEl.parentNode) flyEl.parentNode.removeChild(flyEl);
      }, 650);
    }

    this.coins = [];
    this.sparks = [];
    this.totalTrayCoins = 0;
    return count;
  }

  /**
   * Remove a single coin from tray (e.g. when dragged to slot)
   */
  removeOneCoin() {
    if (this.totalTrayCoins <= 0) return false;
    this.totalTrayCoins--;
    if (this.coins.length > 0) {
      this.coins.pop();
    }
    return true;
  }

  /**
   * Spawn a coin dropping from the chute at top center
   */
  dropChuteCoin(isJackpot = false) {
    const startX = this.width / 2 + (Math.random() - 0.5) * (30 * this.scale);
    const startY = 10 * this.scale;
    const r = (11 + Math.random() * 2) * this.scale;

    let vx, vy;
    if (isJackpot) {
      // Fountain explosion: shoots upward and spreads out!
      vx = (Math.random() - 0.5) * 12 * this.scale;
      vy = -(7 + Math.random() * 8) * this.scale;
      for (let s = 0; s < 4; s++) {
        this.sparks.push({
          x: startX,
          y: startY,
          vx: (Math.random() - 0.5) * 8 * this.scale,
          vy: -(3 + Math.random() * 8) * this.scale,
          life: 1.0,
          decay: 0.02 + Math.random() * 0.03,
          color: ['#fff799', '#ffe066', '#ffd700', '#ffffff'][Math.floor(Math.random() * 4)],
          size: (2 + Math.random() * 3) * this.scale
        });
      }
    } else {
      vx = (Math.random() - 0.5) * 4.5 * this.scale;
      vy = (1.5 + Math.random() * 2.5) * this.scale;
    }

    const coin = {
      x: startX,
      y: startY,
      vx: vx,
      vy: vy,
      angle: Math.random() * Math.PI * 2,
      vAngle: (Math.random() - 0.5) * 0.35,
      radius: r,
      restitution: 0.38 + Math.random() * 0.12,
      friction: 0.94,
      settled: false,
      settleCount: 0,
      shadeVariation: 0.85 + Math.random() * 0.3
    };

    // Cap active visual physics coins to 150
    if (this.coins.length >= 150) {
      this.coins.shift();
    }

    this.coins.push(coin);
    this.totalTrayCoins++;
  }

  /**
   * Payout sequence with capped speed:
   * Batches coins and accelerates rate for large wins
   */
  startPayout(amount, onTick, onComplete, isJackpot = false) {
    if (amount <= 0) {
      if (onComplete) onComplete();
      return;
    }

    this.isPayingOut = true;
    let remaining = amount;

    // Flash the tray payout lamp
    const trayEl = document.querySelector('.tray-panel');
    if (trayEl) trayEl.classList.add('payout-active');

    // Interval pacing
    const intervalMs = amount > 60 ? 35 : (amount > 20 ? 50 : 80);
    const coinsPerTick = amount > 120 ? 3 : (amount > 60 ? 2 : 1);

    const payoutInterval = setInterval(() => {
      const dropCount = Math.min(remaining, coinsPerTick);
      for (let i = 0; i < dropCount; i++) {
        this.dropChuteCoin(isJackpot);
        // Play coin clink with subtle random pitch variance
        if (window.audioEngine) {
          window.audioEngine.playCoinDing(1.0 + (Math.random() - 0.5) * 0.15);
        }
      }

      remaining -= dropCount;
      if (onTick) {
        onTick(remaining, dropCount);
      }

      if (remaining <= 0) {
        clearInterval(payoutInterval);
        this.isPayingOut = false;
        if (trayEl) trayEl.classList.remove('payout-active');
        if (window.audioEngine) {
          window.audioEngine.playPayoutFinish();
        }
        if (onComplete) onComplete();
      }
    }, intervalMs);
  }

  /**
   * Main physics animation loop
   */
  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const padLeft = 14 * this.scale;
    const padRight = this.width - 14 * this.scale;

    // Update and draw sparkles
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vy += this.gravity * 0.3;
      sp.life -= sp.decay;

      if (sp.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = sp.life;
      this.ctx.fillStyle = sp.color;
      this.ctx.beginPath();
      this.ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Update and draw coins
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];

      if (!c.settled) {
        c.vy += this.gravity;
        c.x += c.vx;
        c.y += c.vy;
        c.angle += c.vAngle;

        // Collision with tray floor (natural coin stacking variation based on coin index)
        const effectiveFloor = this.floorY - Math.min(36 * this.scale, (i / 7) * this.scale * (0.7 + Math.sin(i * 1.6) * 0.3));
        if (c.y + c.radius >= effectiveFloor) {
          c.y = effectiveFloor - c.radius;
          c.vy = -c.vy * c.restitution;
          c.vx *= c.friction;
          c.vAngle *= 0.8;

          // Check for settling
          if (Math.abs(c.vy) < 0.8 * this.scale && Math.abs(c.vx) < 0.5 * this.scale) {
            c.settleCount++;
            if (c.settleCount > 3) {
              c.settled = true;
              c.vy = 0;
              c.vx = 0;
              c.vAngle = 0;
            }
          }
        }

        // Collision with left/right tray walls
        if (c.x - c.radius < padLeft) {
          c.x = padLeft + c.radius;
          c.vx = -c.vx * 0.6;
        } else if (c.x + c.radius > padRight) {
          c.x = padRight - c.radius;
          c.vx = -c.vx * 0.6;
        }
      }

      this.drawCoin(c);
    }

    // Draw prominent [🪙 × N] counter badge
    if (this.totalTrayCoins > 0) {
      this.drawCounterBadge();
    }

    requestAnimationFrame(this.animate);
  }

  /**
   * Render prominent [🪙 × N] counter badge (no solid stepped shapes)
   */
  drawCounterBadge() {
    const ctx = this.ctx;
    ctx.save();

    // Draw Badge in top right corner
    const badgeText = `🪙 × ${this.totalTrayCoins}`;
    ctx.font = `bold ${Math.round(13 * this.scale)}px 'Courier New', monospace`;
    const textMetrics = ctx.measureText(badgeText);
    const badgeW = textMetrics.width + 16 * this.scale;
    const badgeH = 22 * this.scale;
    const badgeX = this.width - badgeW - 10 * this.scale;
    const badgeY = 8 * this.scale;

    // Badge background box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.5 * this.scale;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4 * this.scale);
    ctx.fill();
    ctx.stroke();

    // Badge text
    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1 * this.scale);

    ctx.restore();
  }

  /**
   * Render authentic ten-dollar Taiwanese coin (拾圓 10)
   */
  drawCoin(coin) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(coin.x, coin.y);
    ctx.rotate(coin.angle);

    const r = coin.radius;

    // Drop shadow
    ctx.beginPath();
    ctx.ellipse(2, 3, r, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.fill();

    if (this.coinSprite) {
      // Render official circular clipped ten-dollar coin image
      ctx.drawImage(this.coinSprite, -r, -r, r * 2, r * 2);
    } else {
      // Procedural fallback
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#cbd5e1';
      ctx.fill();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.2 * this.scale;
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.font = `bold ${Math.round(r * 0.9)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('10', 0, 1);
    }

    ctx.restore();
  }
}

/**
 * Animated Coin Insertion sequence:
 * Uses the authentic ten-dollar coin image sliding in from off-screen,
 * spinning (rotateY) and shrinking into the slot in ~0.5s.
 * NO cabinet shake: slot indicator light flashes once, sounds play,
 * and CREDIT / INSERTED numbers tick upward.
 */
function triggerCoinInsertionAnimation(slotElementId, cabinetElementId, onCreditStep, onFinished) {
  const slotEl = document.getElementById(slotElementId);
  if (!slotEl) return;

  const slotRect = slotEl.getBoundingClientRect();
  const targetX = slotRect.left + slotRect.width * 0.48;
  const targetY = slotRect.top + slotRect.height * 0.52;

  // Create flying coin element using 10-dollar coin image
  const coinEl = document.createElement('div');
  coinEl.className = 'flying-coin-inserted';
  document.body.appendChild(coinEl);

  // Initial offscreen/flying position (slides in from right/top)
  const startX = targetX + 130;
  const startY = targetY - 100;

  coinEl.style.left = `${startX}px`;
  coinEl.style.top = `${startY}px`;
  coinEl.style.transform = 'translate(0px, 0px) scale(1) rotateY(0deg)';
  coinEl.style.opacity = '1';

  // Play metallic slide sound immediately
  if (window.audioEngine) {
    window.audioEngine.playCoinSlide();
  }

  // Force reflow and trigger glide into slot with 3D spin and shrink
  requestAnimationFrame(() => {
    coinEl.style.transition = 'transform 0.46s cubic-bezier(0.2, 0.8, 0.4, 1), opacity 0.46s ease-in';
    coinEl.style.transform = `translate(${targetX - startX}px, ${targetY - startY}px) scale(0.14) rotateY(720deg)`;
    coinEl.style.opacity = '0.3';
  });

  // When coin reaches slot: ~450ms
  setTimeout(() => {
    // Hide flying coin
    if (coinEl.parentNode) {
      coinEl.parentNode.removeChild(coinEl);
    }

    // Play mechanical drop rattle inside machine
    if (window.audioEngine) {
      window.audioEngine.playMechanicalDrop();
    }

    // 1. NO SHAKE: Visual feedback is slot indicator light flash!
    const readyLamp = document.getElementById('coin-ready-lamp');
    if (readyLamp) {
      readyLamp.classList.remove('lamp-flash-insert');
      void readyLamp.offsetWidth; // Reflow
      readyLamp.classList.add('lamp-flash-insert');
      setTimeout(() => readyLamp.classList.remove('lamp-flash-insert'), 400);
    }

    // Flash the top-right inserted amount display box & display
    const insertedBox = document.getElementById('box-top-inserted');
    if (insertedBox) {
      insertedBox.classList.add('led-flash');
      setTimeout(() => insertedBox.classList.remove('led-flash'), 400);
    }
    const insertedDisplay = document.getElementById('display-inserted');
    if (insertedDisplay) {
      insertedDisplay.classList.add('led-flash');
      setTimeout(() => insertedDisplay.classList.remove('led-flash'), 400);
    }

    // Tick credit counter upward (+10) step-by-step
    const creditSteps = 10;
    let currentStep = 0;

    const creditInterval = setInterval(() => {
      currentStep++;
      if (window.audioEngine) {
        window.audioEngine.playCreditTick(currentStep);
      }

      if (onCreditStep) {
        onCreditStep(1); // increment 1 each step
      }

      if (currentStep >= creditSteps) {
        clearInterval(creditInterval);
        if (onFinished) onFinished();
      }
    }, 65);
  }, 450);
}
