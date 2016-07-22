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
    if (this.valid(x,y) && this.terrain(x,y).name !== 'seawater') {
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
    this._terrain = createGrid(this.width, this.height, function(){ return new Terrain('seawater'); });
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
    var y = Math.round(this.height / 2);
    var x = Math.round(this.width / 2);

    // Make a visitor center in the middle of the island.
    // It consists of three adjoining rectangles.
    var x = this.width/2;
    var y = this.height/2;
    this.makeRectangle(x, y, 7, 5, 'wall');
    this.makeRectangle(x-10, y-1, 8, 7, 'wall');
    this.makeRectangle(x+9, y-1, 8, 7, 'wall');

    // Make pylons every 14 tiles, partitioning the island into rectangles.
    // Then we'll join together rectangles to make big paddocks.
    // Classify each rectangle according to its features.
    var x = 1;
    var rects = createGrid(this.width/14 |0 + 1, this.height/14 |0 + 1, function(){ return { uf: ++x, size: 1, can_be_paddock: true }; });
    function union_find(a, b) {
        if (a === b) return;
        a.size += b.size;
        for (var i=0; i < rects.length; ++i) {
            for (var j=0; j < rects[i].length; ++j) {
                if (rects[i][j] === b) {
                    rects[i][j] = a;
                }
            }
        }
    }
    for (var x = 0; x < this.width; ++x) {
        for (var y = 0; y < this.height; ++y) {
            var x14 = x/14|0, y14 = y/14|0;
            // Our fences shouldn't cross water (seawater or pools).
            if (this.terrain(x,y).name == 'water' || this.terrain(x,y).name == 'seawater') {
                if (x > 0 && x % 14 == 0) {
                    union_find(rects[x14][y14], rects[x14-1][y14]);
                }
                if (y > 0 && y % 14 == 0) {
                    union_find(rects[x14][y14], rects[x14][y14-1]);
                }
            }
            // Paddocks shouldn't go right up against the sea.
            if (this.terrain(x,y).name == 'seawater' || this.terrain(x,y).name == 'wall') {
                rects[x14][y14].can_be_paddock = false;
            }
        }
    }
    for (var i=0; i < this.width/14 - 1; ++i) {
        for (var j=0; j < this.height/14 - 1; ++j) {
            if (rects[i][j].can_be_paddock && rects[i][j].size < 9) {
                if (rects[i+1][j] !== rects[i][j] && rects[i+1][j].can_be_paddock && rects[i+1][j].size < 4) {
                    union_find(rects[i][j], rects[i+1][j]);
                }
            }
            if (rects[i][j].can_be_paddock && rects[i][j].size < 9) {
                if (rects[i][j+1] !== rects[i][j] && rects[i][j+1].can_be_paddock && rects[i][j+1].size < 4) {
                    union_find(rects[i][j], rects[i][j+1]);
                }
            }
        }
    }
    // Now make the fences.
    for (var x = 1; x < this.width-1; ++x) {
        for (var y = 1; y < this.height-1; ++y) {
            var x14 = x/14|0, y14 = y/14|0;
            if (x % 14 == 0 && y % 14 == 0) {
                if (rects[x14][y14-1] !== rects[x14-1][y14-1] && (rects[x14][y14-1].can_be_paddock || rects[x14-1][y14-1].can_be_paddock)) {
                    this.setTerrain(x,y, new Terrain('fence'));
                } else if (rects[x14-1][y14] !== rects[x14-1][y14-1] && (rects[x14-1][y14].can_be_paddock || rects[x14-1][y14-1].can_be_paddock)) {
                    this.setTerrain(x,y, new Terrain('fence'));
                }
            }
            if (x % 14 == 0) {
                if (rects[x14][y14] !== rects[x14-1][y14] && (rects[x14][y14].can_be_paddock || rects[x14-1][y14].can_be_paddock)) {
                    this.setTerrain(x,y, new Terrain('fence'));
                }
            }
            if (y % 14 == 0) {
                if (rects[x14][y14] !== rects[x14][y14-1] && (rects[x14][y14].can_be_paddock || rects[x14][y14-1].can_be_paddock)) {
                    this.setTerrain(x,y, new Terrain('fence'));
                }
            }
        }
    }
    // And pylons.
    for (var x = 1; x < this.width-1; ++x) {
        for (var y = 1; y < this.height-1; ++y) {
            if (this.terrain(x,y).name == 'fence') {
                var ns = (this.terrain(x+1,y).name == 'fence') || (this.terrain(x-1,y).name == 'fence');
                var ew = (this.terrain(x,y+1).name == 'fence') || (this.terrain(x,y-1).name == 'fence');
                if (ns && ew) {
                    this.setTerrain(x-1,y-1, new Terrain('low wall'));
                    this.setTerrain(x-1,y, new Terrain('low wall'));
                    this.setTerrain(x-1,y+1, new Terrain('low wall'));
                    this.setTerrain(x,y-1, new Terrain('low wall'));
                    this.setTerrain(x,y, new Terrain('low wall'));
                    this.setTerrain(x,y+1, new Terrain('low wall'));
                    this.setTerrain(x+1,y-1, new Terrain('low wall'));
                    this.setTerrain(x+1,y, new Terrain('low wall'));
                    this.setTerrain(x+1,y+1, new Terrain('low wall'));
                } else {
                    if (ROT.RNG.getPercentage() <= 10) {
                        this.setTerrain(x,y, new Terrain('grass'));
                    }
                }
            }
        }
    }
};

var Terrain = function(name) {
    this.name = name;
    this.isMemorized = false;
    this.isMemorable = false;
    this.isNatural = false;
    switch (this.name) {
        case 'aether':
            this.appearance = ['X', '#fff'];
            this.movementCost = Infinity;
            this.translucence = 0;
            break;
        case 'wall':
            this.appearance = ['#', '#777'];
            this.movementCost = Infinity;
            this.translucence = 0;
            this.isMemorable = true;
            break;
        case 'low wall':
            this.appearance = ['#', '#777'];
            this.movementCost = Infinity;
            this.translucence = 0.5;
            this.isMemorable = true;
            break;
        case 'floor':
            this.appearance = ['.', '#777'];
            this.movementCost = 1;
            this.translucence = 1;
            break;
        case 'fence':
            this.appearance = ['+', '#f11'];
            this.movementCost = Infinity;
            this.translucence = 1;
            break;
        case 'dirt':
            this.appearance = [['.'].random(), 'brown'];
            this.movementCost = 1;
            this.translucence = 1;
            this.isNatural = true;
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
            this.appearance = ['~', 'steelblue'];
            this.movementCost = Infinity;
            this.translucence = 1;
            this.isNatural = true;
            break;
        case 'seawater':
            this.appearance = [['\u223C', '≈'].random(), 'steelblue'];
            this.movementCost = Infinity;
            this.translucence = 0.95;
            this.isNatural = true;
            break;
        default:
            assert(false, 'bad Terrain name');
    }
};
Terrain.prototype.the = function() {
    return 'the ' + this.name;
};
Terrain.prototype.a = function() {
    switch (this.name) {
        case 'aether':
        case 'grass':
        case 'dirt':
        case 'water':
        case 'seawater':
            return this.the();
        default:
            return 'a ' + this.name;
    }
};
Terrain.seawaterGlyphForCoordinates = function(x,y, time) {
    var p = Terrain.animateWater_perlin;
    return ['\u223C', '≈'][Math.sin(p.noise(x/10,y/10,time/10000)) > 0 ? 0 : 1];
}
Terrain.animateWater = function() {
    var now = Date.now();
    var dx = Terrain.animateWater_dx;
    var dy = Terrain.animateWater_dy;
    for (var key in Game.display._data) {
        var data = Game.display._data[key];
        if (data[2] == '\u223C' || data[2] == '≈') {
            data[2] = Terrain.seawaterGlyphForCoordinates(data[0] + dx, data[1] + dy, now);
            Game.display.draw(data[0], data[1], data[2], data[3], data[4]);
        }
    }
};
Terrain.animateWater_perlin = new ClassicalNoise();
