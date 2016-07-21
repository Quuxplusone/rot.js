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
Map.prototype.setTerrainIfLand = function(x,y, tile) {
    if (this.valid(x,y) && this.terrain(x,y).name !== 'water') {
        this._terrain[x][y] = tile;
    }
};
Map.prototype.makeRectangle = function(ux, uy, width, height, name) {
    for (var x = ux; x < ux + width; ++x) {
        for (var y = uy; y < uy + height; ++y) {
            this.setTerrain(x,y, new Terrain(name));
        }
    }
};
Map.prototype.makeBlob = function(cx, cy, width, height, name) {
    var did_something = false;
    for (var x = Math.round(cx - width/2); x < cx - width/2 + width; ++x) {
        for (var y = Math.round(cy - height/2); y < cy - height/2 + height; ++y) {
            if ({x:x,y:y*width/height}.euclideanDistanceTo({x:cx,y:cy*width/height}) < width/2) {
                if (this.terrain(x,y).name != name) {
                    this.setTerrain(x, y, new Terrain(name));
                    did_something = true;
                }
            }
        }
    }
    if (width >= 3 && height >= 3) {
        var count = 0;
        for (var i=0; i < 6 && count < 3; ++i) {
            var a = ROT.RNG.getUniform() * 2 * Math.PI;
            if (this.makeBlob(cx + width/2*Math.cos(a), cy + height/2*Math.sin(a), width/3, height/3, name)) {
                count += 1;
            }
        }
    }
    return did_something;
};
Map.prototype.generateDungeon = function() {
    var water = new Terrain('water');
    this._terrain = createGrid(this.width, this.height, function(){ return water; });
    this.makeBlob(this.width/2, this.height/2, this.width-160, this.height-50, 'grass');
    // Make pools of water with accompanying tall grass and bushes.
    for (var t1 = 0; t1 < 3; ++t1) {
        var x = ROT.RNG.getUniformInt(0, this.width-1);
        var y = ROT.RNG.getUniformInt(0, this.height-1);
        this.makeBlob(x, y, 5, 4, 'water');
        x += ROT.RNG.getUniformInt(-3, 3);
        y += ROT.RNG.getUniformInt(-2, 2);
        for (var t2 = 0; t2 < 4; ++t2) {
            var tx = ROT.RNG.getNormalInt(x-3, x+3);
            var ty = ROT.RNG.getNormalInt(y-3, y+3);
            this.setTerrainIfLand(tx,ty, new Terrain('bush'));
            this.setTerrainIfLand(tx+1,ty, new Terrain('tall grass'));
            this.setTerrainIfLand(tx-1,ty, new Terrain('tall grass'));
            this.setTerrainIfLand(tx,ty+1, new Terrain('tall grass'));
            this.setTerrainIfLand(tx,ty-1, new Terrain('tall grass'));
        }
    }
    // Make some random tall grass.
    for (var t1 = 0; t1 < 10; ++t1) {
        var x = ROT.RNG.getUniformInt(0, this.width-1);
        var y = ROT.RNG.getUniformInt(0, this.height-1);
        for (var t2 = 0; t2 < 10; ++t2) {
            var tx = ROT.RNG.getNormalInt(x-5, x+5);
            var ty = ROT.RNG.getNormalInt(y-5, y+5);
            this.setTerrainIfLand(tx,ty, new Terrain('tall grass'));
            this.setTerrainIfLand(tx+1,ty, new Terrain('tall grass'));
            this.setTerrainIfLand(tx-1,ty, new Terrain('tall grass'));
            this.setTerrainIfLand(tx,ty+1, new Terrain('tall grass'));
            this.setTerrainIfLand(tx,ty-1, new Terrain('tall grass'));
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
            this.setTerrainIfLand(tx,ty, new Terrain('bush'));
        }
        for (var t2 = 0; t2 < num_trees; ++t2) {
            var tx = ROT.RNG.getNormalInt(x-5, x+5);
            var ty = ROT.RNG.getNormalInt(y-5, y+5);
            this.setTerrainIfLand(tx,ty, new Terrain('tree'));
        }
    }
    // Okay, now humans arrive on the island.
    // Make a boat dock on the east shore.
    var y = ROT.RNG.getUniformInt(Math.round(this.height*0.4), Math.round(this.height*0.6));
    var x = this.width/2;
    assert(this.terrain(x,y).name != 'water');
    while (this.terrain(x,y).name != 'water') {
        ++x;
    }
    this.setTerrain(x-1,y-1, new Terrain('floor'));
    this.setTerrain(x-1,y, new Terrain('floor'));
    this.setTerrain(x-1,y+1, new Terrain('floor'));
    this.setTerrain(x,y-1, new Terrain('floor'));
    this.setTerrain(x,y, new Terrain('floor'));
    this.setTerrain(x,y+1, new Terrain('floor'));
    this.setTerrain(x+1,y-1, new Terrain('floor'));
    this.setTerrain(x+1,y, new Terrain('floor'));
    this.setTerrain(x+1,y+1, new Terrain('floor'));
    this.setTerrain(x-1,y+2, new Terrain('low wall'));
    this.setTerrain(x-2,y+2, new Terrain('low wall'));
    this.setTerrain(x-2,y+3, new Terrain('low wall'));
    this.setTerrain(x-1,y-2, new Terrain('low wall'));
    this.setTerrain(x-2,y-2, new Terrain('low wall'));
    this.setTerrain(x-2,y-3, new Terrain('low wall'));
    // Make a visitor center in the middle of the island.
    // It consists of three adjoining rectangles.
    var x = this.width/2;
    var y = this.height/2;
    var w = ROT.RNG.getUniformInt(5, 10);
    var h = ROT.RNG.getUniformInt(4, 7);
    this.makeRectangle(x, y, w, h, 'low wall');
    x += w;
    y -= h/2;
    w = ROT.RNG.getUniformInt(5, 10);
    h = ROT.RNG.getUniformInt(4, 7);
    this.makeRectangle(x, y, w, h, 'low wall');
    x += ROT.RNG.getUniformInt(Math.round(-w/2), Math.round(w/2));
    y -= h;
    w = ROT.RNG.getUniformInt(5, 10);
    h = ROT.RNG.getUniformInt(4, 7);
    this.makeRectangle(x, y, w, h, 'low wall');


    // Make fences with holes in them.
    var fx = ROT.RNG.getUniformInt(0, 10);
    var fy = ROT.RNG.getUniformInt(0, 10);
    for (var x = 0; x < this.width; ++x) {
        for (var y = 0; y < this.height; ++y) {
            if ((x % 40 == fx || y % 30 == fy)) {
                if (ROT.RNG.getPercentage() <= 95) {
                    this.setTerrainIfLand(x,y, new Terrain('fence'));
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
        case 'low wall':
            this.appearance = ['#', '#777'];
            this.movementCost = Infinity;
            this.translucence = 0.5;
            this.isNatural = false;
            break;
        case 'floor':
            this.appearance = ['.', '#777'];
            this.movementCost = 1;
            this.translucence = 1;
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
            this.translucence = 0.8;
            this.isNatural = true;
            break;
        case 'bush':
            this.appearance = ['%', 'olive'];
            this.movementCost = 2;
            this.translucence = 0.5;
            this.isNatural = true;
            break;
        case 'tree':
            this.appearance = ['o', 'brown'];
            this.movementCost = Infinity;
            this.translucence = 0;
            this.isNatural = true;
            break;
        case 'water':
            this.appearance = [['~', '≈'].random(), 'steelblue'];
            this.movementCost = Infinity;
            this.translucence = 1;
            this.isNatural = true;
            break;
        default:
            assert(false, 'bad Terrain name');
    }
};
Terrain.prototype.the = function() {
    return 'the ' + this.name;
};
