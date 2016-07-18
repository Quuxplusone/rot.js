// An object with x and y fields is considered a "coordinate", and gets extra functionality.

var randomDelta = function() {
    switch (ROT.RNG.getUniformInt(1,8)) {
        case 1: return {x: -1, y: -1};
        case 2: return {x: -1, y: 0};
        case 3: return {x: -1, y: +1};
        case 4: return {x:  0, y: -1};
        case 5: return {x:  0, y: +1};
        case 6: return {x: +1, y: -1};
        case 7: return {x: +1, y: 0};
        case 8: return {x: +1, y: +1};
    }
    assert(false);
};

Object.prototype.manhattanDistanceTo = function(other) {
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
};

Object.prototype.mooreDistanceTo = function(other) {
    return Math.max(Math.abs(this.x - other.x), Math.abs(this.y - other.y));
};

Object.prototype.euclideanDistanceTo = function(other) {
    var dx = (this.x - other.x);
    var dy = (this.y - other.y);
    return Math.sqrt(dx*dx + dy*dy);
};

Object.prototype.deltaToward = function(other) {
    var dx = (other.x - this.x);
    var dy = (other.y - this.y);
    dx = (dx < 0 ? -1 : (dx > 0 ? +1 : 0));
    dy = (dy < 0 ? -1 : (dy > 0 ? +1 : 0));
    return {x:dx, y:dy};
};

Object.prototype.coordKey = function() {
    return (this.x + ',' + this.y);
};

Object.prototype.coordEquals = function(other) {
    return (this.x == other.x) && (this.y == other.y);
};

Object.prototype.coordPlus = function(other) {
    return {x: (this.x + other.x), y: (this.y + other.y)};
};

Object.prototype.deltaRotateLeft = function() {
    if (this.x > 0 && this.y == 0) {
        return {x: this.x, y: -this.x};
    } else if (this.x > 0 && this.y < 0) {
        return {x: 0, y: this.y};
    } else if (this.x == 0 && this.y < 0) {
        return {x: this.y, y: this.y};
    } else if (this.x < 0 && this.y < 0) {
        return {x: this.x, y: 0};
    } else if (this.x < 0 && this.y == 0) {
        return {x: this.x, y: -this.x};
    } else if (this.x < 0 && this.y > 0) {
        return {x: 0, y: this.y};
    } else if (this.x == 0 && this.y > 0) {
        return {x: this.y, y: this.y};
    } else if (this.x > 0 && this.y > 0) {
        return {x: this.x, y: 0};
    } else {
        assert(false);
    }
};

Object.prototype.deltaRotateRight = function() {
    if (this.x > 0 && this.y == 0) {
        return {x: this.x, y: this.x};
    } else if (this.x > 0 && this.y > 0) {
        return {x: 0, y: this.y};
    } else if (this.x == 0 && this.y > 0) {
        return {x: -this.y, y: this.y};
    } else if (this.x < 0 && this.y > 0) {
        return {x: this.x, y: 0};
    } else if (this.x < 0 && this.y == 0) {
        return {x: this.x, y: this.x};
    } else if (this.x < 0 && this.y < 0) {
        return {x: 0, y: this.y};
    } else if (this.x == 0 && this.y < 0) {
        return {x: -this.y, y: this.y};
    } else if (this.x > 0 && this.y < 0) {
        return {x: this.x, y: 0};
    } else {
        assert(false);
    }
};

Object.prototype.deltaInvert = function() {
    return {x: -this.x, y: -this.y};
};

Array.prototype.averagePosition = function() {
    var x = 0;
    var y = 0;
    for (var i=0; i < this.length; ++i) {
        x += this[i].x;
        y += this[i].y;
    }
    return {x: Math.round(x / this.length), y: Math.round(y / this.length)};
};
