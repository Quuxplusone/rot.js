var Map = function(width, height) {
    this.width = width;
    this.height = height;
    this.clear();
}
Map.prototype.clear = function() {
    this._terrain = {};
    for (var x = 0; x < width; ++x) {
        for (var y = 0; y < height; ++y) {
            this._terrain[x + ',' + y] = new Terrain('wall');
        }
    }
};
Map.prototype.terrain = function(x, y) {
    return this._terrain[x + ',' + y];
};
Map.prototype.lightPassesCallback = function(x,y) {
    // "Does light pass this space?", in the format expected by ROT.FOV.PreciseShadowcasting.
    if (0 <= x && x < this.width) {
        if (0 <= y && y < this.height) {
            return !this.terrain(x, y).blocksSight;
        }
    }
    return false;
};
Map.prototype.getAllPassableCoordinates = function() {
    var result = [];
    for (var x = 0; x < this.width; ++x) {
        for (var y = 0; y < this.height; ++y) {
            if (!this.terrain(x, y).blocksWalking) {
                result.push(x + ',' + y);
            }
        }
    }
    return result;
};

Map.prototype.generateDungeon = function() {
    this.clear();
    var d = new ROT.Map.Digger(this.width, this.height);
    d.create(function() {
        this._terrain[x + ',' + y] = new Terrain('floor');
    });
};


var Terrain = function(name) {
    this.name = name;
    switch (this.name) {
        case 'wall':
            this.appearance = ['#'];
            this.blocksWalking = true;
            this.blocksSight = true;
            break;
        case 'floor':
            this.appearance = ['.'];
            this.blocksWalking = false;
            this.blocksSight = false;
            break;
    }
};
Terrain.prototype.the = function() {
    return 'the ' + this.name;
};
