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
    this._terrain = createGrid(this.width, this.height, function(){ return new Terrain('grass'); });
    var fx = ROT.RNG.getUniformInt(0, 10);
    var fy = ROT.RNG.getUniformInt(0, 10);
    for (var x = 0; x < this.width; ++x) {
        for (var y = 0; y < this.height; ++y) {
            if ((x % 40 == fx || y % 30 == fy)) {
                if (ROT.RNG.getPercentage() <= 95) {
                    this._terrain[x][y] = new Terrain('fence');
                }
            }
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
            if (this.valid(tx,ty)) {
                this._terrain[tx][ty] = new Terrain('tree');
            }
        }
    }
};

var Terrain = function(name) {
    this.name = name;
    switch (this.name) {
        case 'aether':
            this.appearance = ['X', '#fff'];
            this.blocksWalking = true;
            this.blocksSight = true;
            break;
        case 'wall':
            this.appearance = ['#', '#777'];
            this.blocksWalking = true;
            this.blocksSight = true;
            break;
        case 'fence':
            this.appearance = ['+', '#f11'];
            this.blocksWalking = true;
            this.blocksSight = false;
            break;
        case 'grass':
            this.appearance = [[',', '.'].random(), 'green'];
            this.blocksWalking = false;
            this.blocksSight = false;
            break;
        case 'tall grass':
            this.appearance = [[';', ':'].random(), 'green'];
            this.blocksWalking = false;
            this.blocksSight = false;
            break;
        case 'tree':
            this.appearance = ['o', 'brown'];
            this.blocksWalking = true;
            this.blocksSight = true;
            break;
        default:
            assert(false, 'bad Terrain name');
    }
};
Terrain.prototype.the = function() {
    return 'the ' + this.name;
};
