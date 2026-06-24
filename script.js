document.addEventListener('DOMContentLoaded', () => {
  const game = new Chess();
  const laserGame = new window.LaserChess();
  const boardEl = document.getElementById('chessboard');

  // Audio Context for sound effects
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioContext ? new AudioContext() : null;

  function playMoveSound() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(450, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  }

  function playCaptureSound() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
    gainNode.gain.setValueAtTime(0.7, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  }

  function playExplosionSound() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    // Low rumble for explosion
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(100, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.5);
    gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
  }

  function playLaserSound() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const gainNode = audioCtx.createGain();
    
    // Sci-fi ZAP sound - dual oscillators for a richer, distinct laser effect
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(1500, audioCtx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
    
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(1600, audioCtx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 0.3);
    osc2.stop(audioCtx.currentTime + 0.3);
  }

  const statusEl = document.getElementById('game-status');
  const historyEl = document.getElementById('move-history');
  const turnIndicatorText = document.getElementById('turn-text');
  const turnIndicatorDot = document.getElementById('turn-dot');
  const modal = document.getElementById('game-over-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modeSelect = document.getElementById('game-mode');
  const standardToggle = document.getElementById('standard-mode-toggle');
  const bombToggle = document.getElementById('bomb-mode-toggle');
  const snowballToggle = document.getElementById('snowball-mode-toggle');
  const playerColorSelect = document.getElementById('player-color');
  const playerColorContainer = document.getElementById('player-color-container');
  
  let isSnowballMode = false;
  let snowballSeriesTurn = 1;
  let snowballMovesRemaining = 1;
  let snowballCurrentPlayer = 'w';
  
  let scoreWhite = 0;
  let scoreBlack = 0;
  const scoreWhiteEl = document.getElementById('score-white');
  const scoreBlackEl = document.getElementById('score-black');
  
  let gameMode = 'pvc';
  let explosionWinner = null;
  let timeoutWinner = null;
  let customFenHistory = [game.fen()]; // Used for reliable undo after explosions
  let customSanHistory = []; // Used to track move history manually since game.load resets it

  // Chess Clock Variables
  const timeControlSelect = document.getElementById('time-control');
  const clockWhiteEl = document.getElementById('clock-white');
  const clockBlackEl = document.getElementById('clock-black');
  const clockWhiteContainer = document.getElementById('clock-white-container');
  const clockBlackContainer = document.getElementById('clock-black-container');
  
  let timeControl = 0;
  let whiteTime = 0;
  let blackTime = 0;
  let timerInterval = null;

  function formatTime(seconds) {
    if (seconds <= 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function updateClockUI() {
    if (timeControl === 0) {
      clockWhiteEl.textContent = "--:--";
      clockBlackEl.textContent = "--:--";
      clockWhiteContainer.classList.remove('active');
      clockBlackContainer.classList.remove('active');
      clockWhiteEl.classList.remove('low-time');
      clockBlackEl.classList.remove('low-time');
      return;
    }
    
    clockWhiteEl.textContent = formatTime(whiteTime);
    clockBlackEl.textContent = formatTime(blackTime);
    
    if (whiteTime <= 10 && whiteTime > 0) clockWhiteEl.classList.add('low-time');
    else clockWhiteEl.classList.remove('low-time');
    
    if (blackTime <= 10 && blackTime > 0) clockBlackEl.classList.add('low-time');
    else clockBlackEl.classList.remove('low-time');

    let currentTurn = (gameMode === 'laser-pvp') ? laserGame.turn : game.turn();
    
    if (game.game_over() || explosionWinner || timeoutWinner || (gameMode === 'laser-pvp' && laserGame.gameOver)) {
        clockWhiteContainer.classList.remove('active');
        clockBlackContainer.classList.remove('active');
    } else {
        if (currentTurn === 'w') {
          clockWhiteContainer.classList.add('active');
          clockBlackContainer.classList.remove('active');
        } else {
          clockBlackContainer.classList.add('active');
          clockWhiteContainer.classList.remove('active');
        }
    }
  }

  function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
  }

  function startTimer() {
    stopTimer();
    if (timeControl === 0) return;
    if (game.game_over() || explosionWinner || timeoutWinner || (gameMode === 'laser-pvp' && laserGame.gameOver)) return;

    timerInterval = setInterval(() => {
      let currentTurn = (gameMode === 'laser-pvp') ? laserGame.turn : game.turn();
      if (currentTurn === 'w') {
         whiteTime--;
         if (whiteTime <= 0) {
            whiteTime = 0;
            timeoutWinner = 'Black';
            checkGameOver();
         }
      } else {
         blackTime--;
         if (blackTime <= 0) {
            blackTime = 0;
            timeoutWinner = 'White';
            checkGameOver();
         }
      }
      updateClockUI();
    }, 1000);
  }

  // Helper to ensure FEN is always valid for chess.js to parseload, 
  // because explosions can remove rooks/kings without updating castling/ep rights in chess.js internals
  function getCleanFen(gameInstance) {
    let fen = gameInstance.fen();
    let tokens = fen.split(' ');
    let castling = tokens[2];
    
    if (castling !== '-') {
      let newCastling = '';
      if (castling.includes('K') && gameInstance.get('h1') && gameInstance.get('h1').type === 'r' && gameInstance.get('e1') && gameInstance.get('e1').type === 'k') newCastling += 'K';
      if (castling.includes('Q') && gameInstance.get('a1') && gameInstance.get('a1').type === 'r' && gameInstance.get('e1') && gameInstance.get('e1').type === 'k') newCastling += 'Q';
      if (castling.includes('k') && gameInstance.get('h8') && gameInstance.get('h8').type === 'r' && gameInstance.get('e8') && gameInstance.get('e8').type === 'k') newCastling += 'k';
      if (castling.includes('q') && gameInstance.get('a8') && gameInstance.get('a8').type === 'r' && gameInstance.get('e8') && gameInstance.get('e8').type === 'k') newCastling += 'q';
      tokens[2] = newCastling || '-';
    }
    
    if (tokens[3] !== '-') {
      let epSquare = tokens[3];
      let rank = parseInt(epSquare[1]);
      let file = epSquare[0];
      let pawnRank = rank === 3 ? 4 : (rank === 6 ? 5 : null);
      if (pawnRank) {
         let p = gameInstance.get(file + pawnRank);
         if (!p || p.type !== 'p') tokens[3] = '-';
      }
    }
    return tokens.join(' ');
  }

  if (modeSelect) {
    modeSelect.addEventListener('change', (e) => {
      gameMode = e.target.value;
      if (playerColorContainer) {
         playerColorContainer.style.display = gameMode === 'pvc' ? 'block' : 'none';
      }
      if (gameMode === 'laser-pvp') {
         if (standardToggle) standardToggle.disabled = true;
         if (bombToggle) bombToggle.disabled = true;
         if (snowballToggle) snowballToggle.disabled = true;
         laserGame.reset();
      } else {
         if (rotateControls) rotateControls.classList.add('hidden');
         if (standardToggle) standardToggle.disabled = false;
         if (bombToggle) bombToggle.disabled = false;
         if (snowballToggle) snowballToggle.disabled = false;
         game.reset();
      }
      initBoard();
      
      const pColor = playerColorSelect ? playerColorSelect.value : 'w';
      if (gameMode === 'pvc' && game.turn() !== pColor && !game.game_over() && !explosionWinner) {
        setTimeout(makeBestMove, 250);
      }
    });
  }

  if (playerColorSelect) {
     playerColorSelect.addEventListener('change', () => {
         resetGame();
     });
  }
  
  if (timeControlSelect) {
     timeControlSelect.addEventListener('change', () => {
         resetGame();
     });
  }

  function handleVariantChange() {
    isSnowballMode = snowballToggle && snowballToggle.checked;
    if (isSnowballMode) {
      snowballSeriesTurn = 1;
      snowballMovesRemaining = 1;
      snowballCurrentPlayer = game.turn();
    }
    updateStatus();
  }

  if (standardToggle) standardToggle.addEventListener('change', handleVariantChange);
  if (bombToggle) bombToggle.addEventListener('change', handleVariantChange);
  if (snowballToggle) snowballToggle.addEventListener('change', handleVariantChange);

  const pieceTheme = {
    'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
    'n': 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
    'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
    'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
    'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
    'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
    'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
    'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
    'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
    'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
    'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
    'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg'
  };

  let selectedSquare = null;
  let validMovesForSelected = [];
  let draggedPieceEl = null;
  let dragSourceSquare = null;

  function initBoard() {
    boardEl.innerHTML = '';
    
    if (gameMode === 'laser-pvp') {
      boardEl.classList.add('laser-board');
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 10; c++) {
          const squareId = `l_${r}_${c}`;
          const square = document.createElement('div');
          
          let sqClass = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
          if (r === 7 && (c === 0 || c === 9)) sqClass += ' helix-white';
          if (r === 0 && (c === 0 || c === 9)) sqClass += ' helix-red';
          
          square.className = sqClass;
          square.dataset.square = squareId;
          square.addEventListener('click', () => handleLaserSquareClick(squareId));
          boardEl.appendChild(square);
        }
      }
    } else {
      boardEl.classList.remove('laser-board');
      const isFlipped = gameMode === 'pvc' && playerColorSelect && playerColorSelect.value === 'b';
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const rank = isFlipped ? r + 1 : 8 - r;
          const file = isFlipped ? files[7 - c] : files[c];
          const squareId = file + rank;
          const square = document.createElement('div');
          square.className = `square ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
          square.dataset.square = squareId;
          
          if (c === 0) {
            const rankLabel = document.createElement('span');
            rankLabel.className = 'coord-rank';
            rankLabel.textContent = rank;
            square.appendChild(rankLabel);
          }
          if (r === 7) {
            const fileLabel = document.createElement('span');
            fileLabel.className = 'coord-file';
            fileLabel.textContent = file;
            square.appendChild(fileLabel);
          }
  
          square.addEventListener('click', () => handleSquareClick(squareId));
          square.addEventListener('dragover', handleDragOver);
          square.addEventListener('drop', (e) => handleDrop(e, squareId));
          boardEl.appendChild(square);
        }
      }
    }
    updateBoard();
  }

  const laserThemes = {
    'laser_w': `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 50 10 L 90 90 L 10 90 Z" fill="%23fff" stroke="%23333" stroke-width="4"/><circle cx="50" cy="30" r="10" fill="red"/></svg>`,
    'laser_b': `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 50 10 L 90 90 L 10 90 Z" fill="%23333" stroke="%23fff" stroke-width="4"/><circle cx="50" cy="30" r="10" fill="red"/></svg>`,
    'defender_w': `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="50" width="80" height="40" fill="%23fff" stroke="%23333" stroke-width="4"/></svg>`,
    'defender_b': `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="50" width="80" height="40" fill="%23333" stroke="%23fff" stroke-width="4"/></svg>`,
    'deflector_w': `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 10 90 L 90 10 L 90 90 Z" fill="%23fff" stroke="%23333" stroke-width="4"/><line x1="10" y1="90" x2="90" y2="10" stroke="cyan" stroke-width="6"/></svg>`,
    'deflector_b': `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 10 90 L 90 10 L 90 90 Z" fill="%23333" stroke="%23fff" stroke-width="4"/><line x1="10" y1="90" x2="90" y2="10" stroke="cyan" stroke-width="6"/></svg>`,
    'switch_w': `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="%23fff" stroke="%23333" stroke-width="4"/><line x1="10" y1="90" x2="90" y2="10" stroke="cyan" stroke-width="6"/></svg>`,
    'switch_b': `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="%23333" stroke="%23fff" stroke-width="4"/><line x1="10" y1="90" x2="90" y2="10" stroke="cyan" stroke-width="6"/></svg>`,
    'king_w': `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="%23fff" stroke="%23333" stroke-width="4"/><circle cx="50" cy="50" r="20" fill="gold"/></svg>`,
    'king_b': `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="%23333" stroke="%23fff" stroke-width="4"/><circle cx="50" cy="50" r="20" fill="gold"/></svg>`,
  };

  function updateBoard() {
    document.querySelectorAll('.square').forEach(sq => {
      const piece = sq.querySelector('.piece');
      if (piece) sq.removeChild(piece);
      sq.classList.remove('highlight', 'selected', 'valid-move', 'valid-capture');
    });

    if (gameMode === 'laser-pvp') {
       for (let r = 0; r < 8; r++) {
         for (let c = 0; c < 10; c++) {
           const piece = laserGame.getPiece(r, c);
           if (piece) {
             const squareId = `l_${r}_${c}`;
             const sqEl = document.querySelector(`[data-square="${squareId}"]`);
             const pieceEl = document.createElement('div');
             pieceEl.className = `piece rot-${piece.rotation}`;
             const themeKey = `${piece.type}_${piece.color}`;
             pieceEl.style.backgroundImage = `url('${laserThemes[themeKey] || pieceTheme[piece.color === 'w' ? 'K' : 'k']}')`;
             pieceEl.dataset.square = squareId;
             // no drag and drop for laser yet
             sqEl.appendChild(pieceEl);
           }
         }
       }
    } else {
      const board = game.board();
      const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece) {
            const rank = 8 - r;
            const squareId = files[c] + rank;
            const sqEl = document.querySelector(`[data-square="${squareId}"]`);
            
            const pieceEl = document.createElement('div');
            pieceEl.className = 'piece';
            const pieceKey = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
            pieceEl.style.backgroundImage = `url(${pieceTheme[pieceKey]})`;
            pieceEl.draggable = true;
            pieceEl.dataset.square = squareId;
            
            pieceEl.addEventListener('dragstart', (e) => handleDragStart(e, squareId, pieceEl));
            pieceEl.addEventListener('dragend', handleDragEnd);
            sqEl.appendChild(pieceEl);
          }
        }
      }
    }
    updateStatus();
    updateHistory();
  }

  // --- Bomb Logic ---
  function handleExplosion(targetSquare, applyVisuals) {
    if (!bombToggle || !bombToggle.checked) return null;
    
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fileIndex = files.indexOf(targetSquare[0]);
    const rank = parseInt(targetSquare[1]);
    
    const explosionSquares = [targetSquare];
    for (let f = -1; f <= 1; f++) {
      for (let r = -1; r <= 1; r++) {
        if (f === 0 && r === 0) continue;
        const newFileIndex = fileIndex + f;
        const newRank = rank + r;
        if (newFileIndex >= 0 && newFileIndex < 8 && newRank >= 1 && newRank <= 8) {
          explosionSquares.push(files[newFileIndex] + newRank);
        }
      }
    }

    const capturingPiece = game.get(targetSquare);
    const capturingColor = capturingPiece ? capturingPiece.color : null;

    let kingExploded = null;
    let anyExploded = false;

    explosionSquares.forEach(sq => {
      const piece = game.get(sq);
      if (piece) {
        // Smart Bomb: Friendly pieces (including the capturing piece) survive the explosion!
        if (!capturingColor || piece.color !== capturingColor) {
          if (piece.type === 'k') {
             kingExploded = piece.color === 'w' ? 'Black' : 'White'; 
          }
          game.remove(sq);
          anyExploded = true;
        }
      }
      
      if (applyVisuals) {
        const sqEl = document.querySelector(`[data-square="${sq}"]`);
        if (sqEl) {
          sqEl.classList.add('explode-anim');
          setTimeout(() => sqEl.classList.remove('explode-anim'), 500);
        }
      }
    });

    if (applyVisuals) {
      playExplosionSound();
    }
    
    // Instantly fix any corrupted internal chess.js state (like castling rights for a blown-up rook)
    if (anyExploded) {
      game.load(getCleanFen(game));
    }
    
    return kingExploded;
  }

  // --- Interaction Logic ---
  function handleSquareClick(squareId) {
    if (game.game_over() || explosionWinner || timeoutWinner) return;
    const pColor = playerColorSelect ? playerColorSelect.value : 'w';
    if (gameMode === 'pvc' && game.turn() !== pColor) return;

    if (selectedSquare) {
      const moveResult = game.move({ from: selectedSquare, to: squareId, promotion: 'q' });
      if (moveResult) {
        processMove(moveResult);
        return;
      }
    }

    const piece = game.get(squareId);
    if (piece && piece.color === game.turn()) {
      selectedSquare = squareId;
      validMovesForSelected = game.moves({ square: squareId, verbose: true });
      renderHighlights();
    } else {
      clearSelection();
    }
  }

  function handleDragStart(e, squareId, pieceEl) {
    if (game.game_over() || explosionWinner || timeoutWinner) return e.preventDefault();
    const pColor = playerColorSelect ? playerColorSelect.value : 'w';
    if (gameMode === 'pvc' && game.turn() !== pColor) return e.preventDefault();
    const piece = game.get(squareId);
    if (!piece || piece.color !== game.turn()) return e.preventDefault();

    selectedSquare = squareId;
    validMovesForSelected = game.moves({ square: squareId, verbose: true });
    renderHighlights();

    draggedPieceEl = pieceEl;
    dragSourceSquare = squareId;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { pieceEl.classList.add('dragging'); }, 0);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(e, targetSquareId) {
    e.preventDefault();
    if (!dragSourceSquare) return;

    const moveResult = game.move({ from: dragSourceSquare, to: targetSquareId, promotion: 'q' });
    if (moveResult) {
      processMove(moveResult);
    }
    clearSelection();
  }

  function handleDragEnd() {
    if (draggedPieceEl) {
      draggedPieceEl.classList.remove('dragging');
      draggedPieceEl = null;
    }
    dragSourceSquare = null;
  }

  // --- Laser Chess Handlers ---
  const rotateControls = document.getElementById('rotate-controls');
  const rotateLeftBtn = document.getElementById('rotate-left-btn');
  const rotateRightBtn = document.getElementById('rotate-right-btn');
  
  if (rotateLeftBtn) {
    rotateLeftBtn.addEventListener('click', () => {
      if (gameMode === 'laser-pvp' && selectedSquare) {
        const parts = selectedSquare.split('_');
        const r = parseInt(parts[1]), c = parseInt(parts[2]);
        if (laserGame.rotatePiece(r, c, -1)) {
          processLaserTurn();
        }
      }
    });
  }

  if (rotateRightBtn) {
    rotateRightBtn.addEventListener('click', () => {
      if (gameMode === 'laser-pvp' && selectedSquare) {
        const parts = selectedSquare.split('_');
        const r = parseInt(parts[1]), c = parseInt(parts[2]);
        if (laserGame.rotatePiece(r, c, 1)) {
          processLaserTurn();
        }
      }
    });
  }

  // --- Board rotate overlay (on-board ↺/↻ buttons) ---
  const boardRotateOverlay = document.getElementById('board-rotate-overlay');
  const boardRotateLeftBtn = document.getElementById('board-rotate-left');
  const boardRotateRightBtn = document.getElementById('board-rotate-right');

  if (boardRotateLeftBtn) {
    boardRotateLeftBtn.addEventListener('click', () => {
      if (gameMode === 'laser-pvp' && selectedSquare) {
        const parts = selectedSquare.split('_');
        const r = parseInt(parts[1]), c = parseInt(parts[2]);
        if (laserGame.rotatePiece(r, c, -1)) {
          processLaserTurn();
        }
      }
    });
  }

  if (boardRotateRightBtn) {
    boardRotateRightBtn.addEventListener('click', () => {
      if (gameMode === 'laser-pvp' && selectedSquare) {
        const parts = selectedSquare.split('_');
        const r = parseInt(parts[1]), c = parseInt(parts[2]);
        if (laserGame.rotatePiece(r, c, 1)) {
          processLaserTurn();
        }
      }
    });
  }

  function showBoardRotateOverlay(squareId) {
    if (!boardRotateOverlay) return;
    const sqEl = document.querySelector(`[data-square="${squareId}"]`);
    const boardContainer = document.querySelector('.board-container');
    if (!sqEl || !boardContainer) return;
    const sqRect = sqEl.getBoundingClientRect();
    const boardRect = boardContainer.getBoundingClientRect();
    boardRotateOverlay.style.left = (sqRect.left - boardRect.left + sqRect.width / 2) + 'px';
    boardRotateOverlay.style.top = (sqRect.top - boardRect.top + sqRect.height / 2) + 'px';
    boardRotateOverlay.classList.remove('hidden');
  }

  function hideBoardRotateOverlay() {
    if (boardRotateOverlay) boardRotateOverlay.classList.add('hidden');
  }

  function handleLaserSquareClick(squareId) {
    if (laserGame.gameOver) return;
    const parts = squareId.split('_');
    const r = parseInt(parts[1]), c = parseInt(parts[2]);
    
    if (selectedSquare) {
       const fromParts = selectedSquare.split('_');
       const fromR = parseInt(fromParts[1]), fromC = parseInt(fromParts[2]);
       
       if (r === fromR && c === fromC) {
          clearSelection();
          return;
       }
       
       if (laserGame.isValidMove(fromR, fromC, r, c)) {
          laserGame.movePiece(fromR, fromC, r, c);
          processLaserTurn();
          return;
       }
    }
    
    const piece = laserGame.getPiece(r, c);
    if (piece && piece.color === laserGame.turn) {
       selectedSquare = squareId;
       renderLaserHighlights();
    } else {
       clearSelection();
    }
  }

  function renderLaserHighlights() {
    document.querySelectorAll('.square').forEach(sq => sq.classList.remove('selected', 'valid-move'));
    const sqEl = document.querySelector(`[data-square="${selectedSquare}"]`);
    if (sqEl) sqEl.classList.add('selected');

    const fromParts = selectedSquare.split('_');
    const fromR = parseInt(fromParts[1]), fromC = parseInt(fromParts[2]);

    const piece = laserGame.getPiece(fromR, fromC);
    if (piece && piece.type !== 'king') {
        showBoardRotateOverlay(selectedSquare);
    } else {
        hideBoardRotateOverlay();
    }

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 10; c++) {
         if (laserGame.isValidMove(fromR, fromC, r, c)) {
            const el = document.querySelector(`[data-square="l_${r}_${c}"]`);
            if (el) el.classList.add('valid-move');
         }
      }
    }
  }

  function processLaserTurn() {
    if (modeSelect) modeSelect.disabled = true;
    clearSelection();
    updateBoard();
    drawLaserBeam();
    updateClockUI();
    if (laserGame.gameOver) {
       modalTitle.textContent = "Laser Chess Over!";
       modalMessage.textContent = `${laserGame.winner} wins by destroying the King.`;
       modal.classList.remove('hidden');
       stopTimer();
    }
  }

  function drawLaserBeam() {
    // Remove old beams
    document.querySelectorAll('.laser-beam').forEach(el => el.remove());
    
    const path = laserGame.lastLaserPath;
    if (!path || path.length === 0) return;
    
    playLaserSound(); // High pitched laser sound

    path.forEach(step => {
       const sqId = `l_${step.r}_${step.c}`;
       const sqEl = document.querySelector(`[data-square="${sqId}"]`);
       if (!sqEl) return;
       
       if (step.type === 'start') return;
       
       if (step.type === 'path') {
           const beam = document.createElement('div');
           beam.className = 'laser-beam';
           if (step.inDir === 0 || step.inDir === 180) beam.classList.add('vertical');
           else beam.classList.add('horizontal');
           sqEl.appendChild(beam);
       } else {
           if (step.inDir !== undefined) {
               const beamIn = document.createElement('div');
               beamIn.className = 'laser-beam';
               if (step.inDir === 0) beamIn.classList.add('connect-bottom');
               else if (step.inDir === 90) beamIn.classList.add('connect-left');
               else if (step.inDir === 180) beamIn.classList.add('connect-top');
               else if (step.inDir === 270) beamIn.classList.add('connect-right');
               sqEl.appendChild(beamIn);
           }
           
           if (step.type === 'reflect' && step.outDir !== undefined) {
               const beamOut = document.createElement('div');
               beamOut.className = 'laser-beam';
               if (step.outDir === 0) beamOut.classList.add('connect-top');
               else if (step.outDir === 90) beamOut.classList.add('connect-right');
               else if (step.outDir === 180) beamOut.classList.add('connect-bottom');
               else if (step.outDir === 270) beamOut.classList.add('connect-left');
               sqEl.appendChild(beamOut);
           }
       }
       
       if (step.type === 'destroy') {
           playExplosionSound();
           sqEl.classList.add('explode-anim');
           setTimeout(() => sqEl.classList.remove('explode-anim'), 500);
       }
    });
  }
  
  function processMove(moveResult) {
    if (modeSelect) modeSelect.disabled = true;
    if (standardToggle) standardToggle.disabled = true;
    if (bombToggle) bombToggle.disabled = true;
    if (snowballToggle) snowballToggle.disabled = true;
    let exploded = false;
    if (moveResult && moveResult.captured) {
      if (bombToggle && bombToggle.checked) {
        const potentialWinner = handleExplosion(moveResult.to, true);
        if (potentialWinner) explosionWinner = potentialWinner;
        exploded = true;
      } else {
        playCaptureSound();
      }
    }
    if (!exploded) {
       playMoveSound();
    }
    
    // Save history manually
    customSanHistory.push(moveResult.san);
    
    let shouldFlipBackTurn = false;
    if (isSnowballMode && !game.game_over() && !explosionWinner) {
      snowballMovesRemaining--;
      if (snowballMovesRemaining > 0 && !game.in_check()) {
        shouldFlipBackTurn = true;
      } else {
        snowballSeriesTurn++;
        snowballMovesRemaining = snowballSeriesTurn;
        snowballCurrentPlayer = game.turn();
      }
    }

    if (shouldFlipBackTurn) {
      let tokens = getCleanFen(game).split(' ');
      tokens[1] = snowballCurrentPlayer; 
      tokens[3] = '-'; 
      game.load(tokens.join(' '));
    }
    
    // Save state for undo functionality after an explosion permanently modified the board
    customFenHistory.push(getCleanFen(game));
    
    clearSelection();
    updateBoard();
    checkGameOver();
    updateClockUI();
    
    const pColor = playerColorSelect ? playerColorSelect.value : 'w';
    if (gameMode === 'pvc' && !game.game_over() && !explosionWinner && !timeoutWinner && game.turn() !== pColor) {
      setTimeout(makeBestMove, 250);
    }
  }

  function renderHighlights() {
    document.querySelectorAll('.square').forEach(sq => {
      sq.classList.remove('selected', 'valid-move', 'valid-capture');
    });
    if (!selectedSquare) return;
    document.querySelector(`[data-square="${selectedSquare}"]`).classList.add('selected');

    validMovesForSelected.forEach(move => {
      const sq = document.querySelector(`[data-square="${move.to}"]`);
      if (move.flags.includes('c') || move.flags.includes('e')) {
        sq.classList.add('valid-capture');
      } else {
        sq.classList.add('valid-move');
      }
    });
  }

  function clearSelection() {
    selectedSquare = null;
    validMovesForSelected = [];
    hideBoardRotateOverlay();
    renderHighlights();
  }

  // --- UI Updates ---
  function updateStatus() {
    let status = '';
    
    if (gameMode === 'laser-pvp') {
       let turn = laserGame.turn === 'w' ? 'White' : 'Black';
       let turnTextDisplay = turn + "'s Turn (Laser Mode)";
       if (laserGame.turn === 'w') {
         turnIndicatorDot.className = 'dot white-dot';
         turnIndicatorText.textContent = turnTextDisplay;
       } else {
         turnIndicatorDot.className = 'dot black-dot';
         turnIndicatorText.textContent = turnTextDisplay;
       }
        if (laserGame.gameOver) {
         status = `Game over, ${laserGame.winner} wins by destroying the King!`;
       } else {
         status = `Laser Chess in progress. Select a piece to move or rotate.`;
       }
       statusEl.textContent = status;
       return;
    }

    let turn = game.turn() === 'w' ? 'White' : 'Black';

    let turnTextDisplay = turn + "'s Turn";
    if (isSnowballMode && !game.game_over() && !explosionWinner) {
       turnTextDisplay += ` (${snowballMovesRemaining} moves left)`;
    }

    if (game.turn() === 'w') {
      turnIndicatorDot.className = 'dot white-dot';
      turnIndicatorText.textContent = turnTextDisplay;
    } else {
      turnIndicatorDot.className = 'dot black-dot';
      turnIndicatorText.textContent = turnTextDisplay;
    }

    if (explosionWinner) {
      status = `Game over, ${explosionWinner} wins by Explosion!`;
    } else if (timeoutWinner) {
      status = `Game over, ${timeoutWinner} wins on time!`;
    } else if (game.in_checkmate()) {
      status = `Game over, ${turn} is in checkmate.`;
    } else if (game.in_draw()) {
      status = 'Game over, drawn position';
    } else {
      status = `${turn} to move`;
      if (game.in_check()) {
        status += `, ${turn} is in check`;
      }
    }
    statusEl.textContent = status;
  }

  function updateHistory() {
    const history = customSanHistory;
    historyEl.innerHTML = '';
    for (let i = 0; i < history.length; i += 2) {
      const row = document.createElement('div');
      row.className = 'move-row';
      const num = document.createElement('div');
      num.className = 'move-number';
      num.textContent = `${Math.floor(i/2) + 1}.`;
      const wMove = document.createElement('div');
      wMove.className = 'move-notation';
      wMove.textContent = history[i];
      const bMove = document.createElement('div');
      bMove.className = 'move-notation';
      bMove.textContent = history[i+1] ? history[i+1] : '';
      row.appendChild(num);
      row.appendChild(wMove);
      row.appendChild(bMove);
      historyEl.appendChild(row);
    }
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function updateScoreUI() {
    scoreWhiteEl.textContent = scoreWhite;
    scoreBlackEl.textContent = scoreBlack;
    
    scoreWhiteEl.classList.remove('winning-score', 'losing-score', 'high-score', 'low-score', 'tied-score');
    scoreBlackEl.classList.remove('winning-score', 'losing-score', 'high-score', 'low-score', 'tied-score');
    
    if (scoreWhite > scoreBlack) {
      scoreWhiteEl.classList.add('high-score');
      scoreBlackEl.classList.add('low-score');
    } else if (scoreBlack > scoreWhite) {
      scoreBlackEl.classList.add('high-score');
      scoreWhiteEl.classList.add('low-score');
    } else {
      scoreWhiteEl.classList.add('tied-score');
      scoreBlackEl.classList.add('tied-score');
    }
  }

  function checkGameOver() {
    let title = "";
    let message = "";
    let over = false;

    if (timeoutWinner) {
      title = "Time's Up!";
      message = `${timeoutWinner} wins on time.`;
      if (timeoutWinner === 'White') scoreWhite++; else scoreBlack++;
      over = true;
    } else if (explosionWinner) {
      title = "BOOM! Checkmate!";
      message = `${explosionWinner} wins the game by explosion.`;
      if (explosionWinner === 'White') scoreWhite++; else scoreBlack++;
      over = true;
    } else if (game.game_over()) {
      over = true;
      if (game.in_checkmate()) {
        title = "Checkmate!";
        if (game.turn() === 'w') {
           message = "Black wins the game.";
           scoreBlack++;
        } else {
           message = "White wins the game.";
           scoreWhite++;
        }
      } else if (game.in_draw()) {
        title = "Draw";
        scoreWhite += 0.5;
        scoreBlack += 0.5;
        if (game.in_stalemate()) message = "Stalemate.";
        else if (game.in_threefold_repetition()) message = "Draw by threefold repetition.";
        else if (game.insufficient_material()) message = "Draw by insufficient material.";
        else message = "Game drawn by the 50-move rule.";
      }
    }

    if (over) {
      stopTimer();
      updateScoreUI();
      modalTitle.textContent = title;
      modalMessage.textContent = message;
      modal.classList.remove('hidden');
    }
  }

  // --- Computer AI Logic ---
  function getPieceValue(piece) {
    if (piece === null) return 0;
    const pieceValues = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 9000 };
    const val = pieceValues[piece.type];
    return piece.color === 'w' ? val : -val;
  }

  function evaluateBoard(gameInstance) {
    let totalEvaluation = 0;
    const board = gameInstance.board();
    let wKing = false;
    let bKing = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p) {
          totalEvaluation += getPieceValue(p);
          if (p.type === 'k') {
            if (p.color === 'w') wKing = true;
            if (p.color === 'b') bKing = true;
          }
        }
      }
    }
    // Huge penalties if a king is missing
    if (!wKing && bKing) return -99999;
    if (!bKing && wKing) return 99999;
    return totalEvaluation;
  }

  function minimax(gameInstance, depth, alpha, beta, isMaximizingPlayer) {
    const evalScore = evaluateBoard(gameInstance);
    // Prune if king exploded
    if (evalScore > 90000 || evalScore < -90000 || depth === 0 || gameInstance.game_over()) {
      return evalScore;
    }

    const moves = gameInstance.moves();
    if (moves.length === 0) return evalScore;

    if (isMaximizingPlayer) {
      let bestVal = -Infinity;
      for (let i = 0; i < moves.length; i++) {
        const fen = getCleanFen(gameInstance); 
        const move = gameInstance.move(moves[i]);
        let kExp = null;
        if (bombToggle && bombToggle.checked && move && move.captured) {
            kExp = handleExplosion(move.to, false);
        }
        
        let value;
        if (kExp === 'Black') value = 99999;
        else if (kExp === 'White') value = -99999;
        else value = minimax(gameInstance, depth - 1, alpha, beta, !isMaximizingPlayer);
        
        bestVal = Math.max(bestVal, value);
        gameInstance.load(fen); 
        alpha = Math.max(alpha, bestVal);
        if (beta <= alpha) break;
      }
      return bestVal;
    } else {
      let bestVal = Infinity;
      for (let i = 0; i < moves.length; i++) {
        const fen = getCleanFen(gameInstance); 
        const move = gameInstance.move(moves[i]);
        let kExp = null;
        if (bombToggle && bombToggle.checked && move && move.captured) {
            kExp = handleExplosion(move.to, false);
        }
        
        let value;
        if (kExp === 'Black') value = 99999;
        else if (kExp === 'White') value = -99999;
        else value = minimax(gameInstance, depth - 1, alpha, beta, !isMaximizingPlayer);
        
        bestVal = Math.min(bestVal, value);
        gameInstance.load(fen); 
        beta = Math.min(beta, bestVal);
        if (beta <= alpha) break;
      }
      return bestVal;
    }
  }

  function makeBestMove() {
    if (game.game_over() || explosionWinner || timeoutWinner) return;
    const possibleMoves = game.moves();
    if (possibleMoves.length === 0) return;

    let bestMove = null;
    let bestValue = Infinity; 

    for (let i = 0; i < possibleMoves.length; i++) {
      const fen = getCleanFen(game);
      const move = possibleMoves[i];
      const moveResult = game.move(move);
      let kExp = null;
      if (bombToggle && bombToggle.checked && moveResult && moveResult.captured) {
         kExp = handleExplosion(moveResult.to, false);
      }
      
      let boardValue;
      if (kExp === 'Black') boardValue = 99999;
      else if (kExp === 'White') boardValue = -99999;
      else boardValue = minimax(game, 2, -Infinity, Infinity, true);
      
      game.load(fen);
      
      if (boardValue < bestValue || (boardValue === bestValue && Math.random() > 0.5)) {
        bestValue = boardValue;
        bestMove = move;
      }
    }

    if (!bestMove) {
        bestMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    }

    const moveResult = game.move(bestMove);
    processMove(moveResult);
  }

  // --- Buttons ---
  function resetGame() {
    document.querySelectorAll('.laser-beam').forEach(el => el.remove());
    
    timeControl = timeControlSelect ? parseInt(timeControlSelect.value, 10) : 0;
    whiteTime = timeControl;
    blackTime = timeControl;
    timeoutWinner = null;
    stopTimer();
    updateClockUI();
    
    if (modeSelect) modeSelect.disabled = false;
    if (gameMode === 'laser-pvp') {
      laserGame.reset();
      updateBoard();
      modal.classList.add('hidden');
      if (timeControl > 0) startTimer();
      return;
    }
    
    if (standardToggle) standardToggle.disabled = false;
    if (bombToggle) bombToggle.disabled = false;
    if (snowballToggle) snowballToggle.disabled = false;
    
    game.reset();
    explosionWinner = null;
    customFenHistory = [getCleanFen(game)];
    customSanHistory = [];
    
    isSnowballMode = snowballToggle && snowballToggle.checked;
    snowballSeriesTurn = 1;
    snowballMovesRemaining = 1;
    snowballCurrentPlayer = 'w';
    
    initBoard();
    modal.classList.add('hidden');
    
    if (timeControl > 0) startTimer();
    
    const pColor = playerColorSelect ? playerColorSelect.value : 'w';
    if (gameMode === 'pvc' && game.turn() !== pColor) {
      setTimeout(makeBestMove, 250);
    }
  }

  document.getElementById('reset-btn').addEventListener('click', resetGame);
  document.getElementById('modal-reset-btn').addEventListener('click', resetGame);

  document.getElementById('undo-btn').addEventListener('click', () => {
    if (gameMode === 'laser-pvp') return; // Undo not supported in laser mode yet
    if (customFenHistory.length > 1) {
      customFenHistory.pop();
      customSanHistory.pop();
      if (gameMode === 'pvc' && customFenHistory.length > 1) {
        customFenHistory.pop();
        customSanHistory.pop();
      }
      const previousFen = customFenHistory[customFenHistory.length - 1];
      game.load(previousFen);
      explosionWinner = null;
      playMoveSound();
      updateBoard();
      if (customFenHistory.length === 1) {
        if (modeSelect) modeSelect.disabled = false;
        if (standardToggle) standardToggle.disabled = false;
        if (bombToggle) bombToggle.disabled = false;
        if (snowballToggle) snowballToggle.disabled = false;
      }
    }
  });

  document.getElementById('reset-score-btn').addEventListener('click', () => {
    scoreWhite = 0;
    scoreBlack = 0;
    updateScoreUI();
  });

  // Start
  initBoard();
});
