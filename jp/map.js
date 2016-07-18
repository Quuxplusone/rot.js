var Map = function(width, height) {
    this.width = width;
    this.height = height;
    this._invalidTerrain = new Terrain('aether');
};
Map.prototype.valid = function(x, y) {
    return (0 <= x && x < this.width && 0 <= y && y < this.height);
};
Map.prototype.terrain = function(x,y) {
    if (this.valid(x,y)) {
        return this._terrain[x][y];
    } else {
        return this._invalidTerrain;
    }
};
Map.prototype.setTerrain = function(x,y, tile) {
    if (this.valid(x,y)) {
        this._terrain[x][y] = tile;
    }
};
Map.prototype.generateDungeon = function() {
    this._terrain = createGrid(this.width, this.height, function(){ return new Terrain('grass'); });
    // Make some random tall grass.
    for (var t1 = 0; t1 < 10; ++t1) {
        var x = ROT.RNG.getUniformInt(0, this.width-1);
        var y = ROT.RNG.getUniformInt(0, this.height-1);
        for (var t2 = 0; t2 < 10; ++t2) {
            var tx = ROT.RNG.getNormalInt(x-5, x+5);
            var ty = ROT.RNG.getNormalInt(y-5, y+5);
            this.setTerrain(tx,ty, new Terrain('tall grass'));
            this.setTerrain(tx+1,ty, new Terrain('tall grass'));
            this.setTerrain(tx-1,ty, new Terrain('tall grass'));
            this.setTerrain(tx,ty+1, new Terrain('tall grass'));
            this.setTerrain(tx,ty-1, new Terrain('tall grass'));
        }
    }
    // Make some random trees.
    for (var t1 = 0; t1 < 10; ++t1) {
        var x = ROT.RNG.getUniformInt(0, this.width-1);
        var y = ROT.RNG.getUniformInt(0, this.height-1);
        var num_trees = ROT.RNG.getNormalInt(3,10);
        for (var t2 = 0; t2 < num_trees; ++t2) {
            var tx = ROT.RNG.getNormalInt(x-5, x+5);
            var ty = ROT.RNG.getNormalInt(y-5, y+5);
            this.setTerrain(tx,ty, new Terrain('tree'));
        }
    }
    // Make fences with holes in them.
    var fx = ROT.RNG.getUniformInt(0, 10);
    var fy = ROT.RNG.getUniformInt(0, 10);
    for (var x = 0; x < this.width; ++x) {
        for (var y = 0; y < this.height; ++y) {
            if ((x % 40 == fx || y % 30 == fy)) {
                if (ROT.RNG.getPercentage() <= 95) {
                    this.setTerrain(x,y, new Terrain('fence'));
                }
            }
        }
    }
};

var Terrain = function(name) {
    this.name = name;
    switch (this.name) {
        case 'aether':
            this.appearance = ['X', '#fff'];
            this.movementCost = Infinity;
            this.translucence = 0;
            this.isNatural = false;
            break;
        case 'wall':
            this.appearance = ['#', '#777'];
            this.movementCost = Infinity;
            this.translucence = 0;
            this.isNatural = false;
            break;
        case 'fence':
            this.appearance = ['+', '#f11'];
            this.movementCost = Infinity;
            this.translucence = 1;
            this.isNatural = false;
            break;
        case 'grass':
            this.appearance = [[',', '.'].random(), 'green'];
            this.movementCost = 1;
            this.translucence = 1;
            this.isNatural = true;
            break;
        case 'tall grass':
            this.appearance = [[';', ':'].random(), 'green'];
            this.movementCost = 1.5;
            this.translucence = 1.5;
            this.isNatural = true;
            break;
        case 'tree':
            this.appearance = ['o', 'brown'];
            this.movementCost = Infinity;
            this.translucence = 0;
            this.isNatural = true;
            break;
        default:
            assert(false, 'bad Terrain name');
    }
};
Terrain.prototype.the = function() {
    return 'the ' + this.name;
};
