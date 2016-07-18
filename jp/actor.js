var Actor = function(x, y) {
    this.x = x || 0;
    this.y = y || 0;
    this.energy = 0;
    this.stealth = 0;  // 0=no stealth; 1=invisible even up close
    this._strategy = null;
    this.currentlyVisibleToPlayer = false;
};
Actor.prototype.setStrategy = function(strategy) { this._strategy = strategy; };

