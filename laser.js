class LaserChess {
  constructor() {
    this.board = []; // 8x10
    this.turn = 'w';
    this.gameOver = false;
    this.winner = null;
    this.lastLaserPath = [];
    this.reset();
  }

  reset() {
    this.board = Array(8).fill(null).map(() => Array(10).fill(null));
    this.turn = 'w';
    this.gameOver = false;
    this.winner = null;
    this.lastLaserPath = [];
    
    // Black (Top)
    this.board[0][0] = { type: 'laser', color: 'b', rotation: 180 };
    this.board[0][4] = { type: 'defender', color: 'b', rotation: 180 };
    this.board[0][5] = { type: 'king', color: 'b', rotation: 180 };
    this.board[0][6] = { type: 'defender', color: 'b', rotation: 180 };
    this.board[0][7] = { type: 'deflector', color: 'b', rotation: 180 };
    this.board[1][2] = { type: 'deflector', color: 'b', rotation: 270 };
    this.board[3][0] = { type: 'deflector', color: 'b', rotation: 90 };
    this.board[3][4] = { type: 'switch', color: 'b', rotation: 90 };
    this.board[3][5] = { type: 'switch', color: 'b', rotation: 0 };
    this.board[3][7] = { type: 'deflector', color: 'b', rotation: 180 };
    this.board[4][0] = { type: 'deflector', color: 'b', rotation: 180 };
    this.board[4][7] = { type: 'deflector', color: 'b', rotation: 90 };
    this.board[5][6] = { type: 'deflector', color: 'b', rotation: 180 };

    // White (Bottom)
    this.board[2][3] = { type: 'deflector', color: 'w', rotation: 0 };
    this.board[3][2] = { type: 'deflector', color: 'w', rotation: 270 };
    this.board[3][9] = { type: 'deflector', color: 'w', rotation: 0 };
    this.board[4][2] = { type: 'deflector', color: 'w', rotation: 0 };
    this.board[4][4] = { type: 'switch', color: 'w', rotation: 180 };
    this.board[4][5] = { type: 'switch', color: 'w', rotation: 270 };
    this.board[4][9] = { type: 'deflector', color: 'w', rotation: 270 };
    this.board[6][7] = { type: 'deflector', color: 'w', rotation: 90 };
    this.board[7][2] = { type: 'deflector', color: 'w', rotation: 0 };
    this.board[7][3] = { type: 'defender', color: 'w', rotation: 0 };
    this.board[7][4] = { type: 'king', color: 'w', rotation: 0 };
    this.board[7][5] = { type: 'defender', color: 'w', rotation: 0 };
    this.board[7][9] = { type: 'laser', color: 'w', rotation: 0 };
  }

  getPiece(r, c) {
    if (r < 0 || r >= 8 || c < 0 || c >= 10) return null;
    return this.board[r][c];
  }

  isValidMove(fromR, fromC, toR, toC) {
    if (this.gameOver) return false;
    const piece = this.getPiece(fromR, fromC);
    if (!piece || piece.color !== this.turn) return false;
    if (piece.type === 'laser') return false; // Laser cannot move
    
    // Restricted squares logic: White cannot enter Red's corners, Black cannot enter White's corners
    if (piece.color === 'w' && toR === 0 && (toC === 0 || toC === 9)) return false;
    if (piece.color === 'b' && toR === 7 && (toC === 0 || toC === 9)) return false;
    
    const dr = Math.abs(toR - fromR);
    const dc = Math.abs(toC - fromC);
    if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) return false;
    
    const targetPiece = this.getPiece(toR, toC);
    if (targetPiece) {
        if (piece.type === 'switch' && (targetPiece.type === 'deflector' || targetPiece.type === 'defender')) {
            return true;
        }
        return false;
    }
    return true;
  }

  movePiece(fromR, fromC, toR, toC) {
    if (!this.isValidMove(fromR, fromC, toR, toC)) return false;
    const targetPiece = this.board[toR][toC];
    if (targetPiece) { // Swap
        this.board[toR][toC] = this.board[fromR][fromC];
        this.board[fromR][fromC] = targetPiece;
    } else {
        this.board[toR][toC] = this.board[fromR][fromC];
        this.board[fromR][fromC] = null;
    }
    this.endTurn();
    return true;
  }

  rotatePiece(r, c, direction) { // 1 for right, -1 for left
    if (this.gameOver) return false;
    const piece = this.getPiece(r, c);
    if (!piece || piece.color !== this.turn) return false;
    piece.rotation = (piece.rotation + (direction * 90) + 360) % 360;
    this.endTurn();
    return true;
  }

  endTurn() {
    this.lastLaserPath = this.fireLaser(this.turn);
    if (!this.gameOver) {
        this.turn = this.turn === 'w' ? 'b' : 'w';
    }
  }

  fireLaser(color) {
    let r = -1, c = -1;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 10; j++) {
        const p = this.board[i][j];
        if (p && p.type === 'laser' && p.color === color) {
          r = i; c = j; break;
        }
      }
    }
    if (r === -1) return [];

    let piece = this.board[r][c];
    let dir = piece.rotation; 
    
    let path = [{r, c, dir, type: 'start'}];
    let active = true;
    let curR = r;
    let curC = c;
    let destroyed = null;

    while (active) {
      if (dir === 0) curR--;
      else if (dir === 90) curC++;
      else if (dir === 180) curR++;
      else if (dir === 270) curC--;

      if (curR < 0 || curR >= 8 || curC < 0 || curC >= 10) {
        path.push({r: curR, c: curC, type: 'end'});
        break;
      }

      const hit = this.board[curR][curC];
      if (hit) {
        const result = this.resolveLaserHit(hit, dir);
        if (result === 'destroy') {
           destroyed = {r: curR, c: curC};
           path.push({r: curR, c: curC, type: 'destroy', inDir: dir});
           active = false;
        } else if (result === 'block') {
           path.push({r: curR, c: curC, type: 'block', inDir: dir});
           active = false;
        } else {
           const outDir = result;
           path.push({r: curR, c: curC, type: 'reflect', outDir: outDir, inDir: dir});
           dir = outDir;
        }
      } else {
        path.push({r: curR, c: curC, type: 'path', inDir: dir});
      }
    }

    if (destroyed) {
      const p = this.board[destroyed.r][destroyed.c];
      if (p.type === 'king') {
         this.gameOver = true;
         this.winner = p.color === 'w' ? 'Black' : 'White';
      }
      this.board[destroyed.r][destroyed.c] = null;
    }

    return path;
  }

  resolveLaserHit(piece, incomingDir) {
    const hitFace = (incomingDir + 180) % 360; 

    if (piece.type === 'king') return 'destroy';
    if (piece.type === 'laser') return 'destroy'; 
    
    if (piece.type === 'defender') {
       if (piece.rotation === hitFace) return 'block'; 
       return 'destroy';
    }

    if (piece.type === 'deflector') {
       const face1 = piece.rotation;
       const face2 = (piece.rotation + 270) % 360;
       
       if (hitFace === face1) {
          return face2; 
       } else if (hitFace === face2) {
          return face1;
       } else {
          return 'destroy';
       }
    }

    if (piece.type === 'switch') {
       const face1 = piece.rotation;
       const face2 = (piece.rotation + 90) % 360;
       const face3 = (piece.rotation + 180) % 360;
       const face4 = (piece.rotation + 270) % 360;
       
       if (hitFace === face1) return face4;
       if (hitFace === face4) return face1;
       if (hitFace === face2) return face3;
       if (hitFace === face3) return face2;
    }
  }
}
window.LaserChess = LaserChess;
