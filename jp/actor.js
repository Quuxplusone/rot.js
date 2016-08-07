var Actor = function(x, y, desc) {
    this.x = x || 0;
    this.y = y || 0;
    this.description = desc || 'actor';
    this.energy = 0;
    this.stealth = 0;  // 0=no stealth; 1=invisible even up close
    this._strategy = null;
    this.currentlyVisibleToPlayer = false;
};
Actor.prototype.setStrategy = function(strategy) { this._strategy = strategy; };
Actor.prototype.the = function() { return 'the ' + this.description; };
Actor.prototype.a = function() {
    switch (this.description[0]) {
        case 'a': case 'e': case 'i': case 'o': case 'u':
            return 'an ' + this.description;
        default:
            return 'a ' + this.description;
    }
};
