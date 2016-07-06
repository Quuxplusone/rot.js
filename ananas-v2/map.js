Array.prototype.removeCoords = function([x,y]) {
    for (var i=0; i < this.length; ++i) {
        if (this[i][0] == x && this[i][1] == y) {
            this.splice(i, 1);
            break;
        }
    }
};

var Map = function(width, height) {
    this.width = width;
    this.height = height;
    this.clear();
};
Map.prototype.valid = function(x, y) {
    return (0 <= x && x < this.width && 0 <= y && y < this.height);
};
Map.prototype.clear = function() {
    this._terrain = {};
    this._room = {};
    this._rooms = [];
    for (var x = 0; x < this.width; ++x) {
        for (var y = 0; y < this.height; ++y) {
            this._room[x + ',' + y] = null;
            this._terrain[x + ',' + y] = new Terrain('wall');
        }
    }
};
Map.prototype.room = function(x,y) {
    return this._room[x + ',' + y];
};
Map.prototype.terrain = function(x,y) {
    return this._terrain[x + ',' + y];
};
Map.prototype.lightPassesCallback = function(x,y) {
    // "Does light pass this space?", in the format expected by ROT.FOV.PreciseShadowcasting.
    return this.valid(x,y) && !this.terrain(x,y).blocksSight;
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
    var dug = 0;
    var start = Date.now();
    // Make some random rooms.
    while (Date.now() - start < 150 && dug < 0.2 * this.width * this.height) {
        var rcx = ROT.RNG.getUniformInt(0, this.width / 2) * 2 + 1;
        var rcy = ROT.RNG.getUniformInt(0, this.height / 2) * 2 + 1;
        var rw = ROT.RNG.getNormalInt(1, 5) * 2 + 1;
        var rh = ROT.RNG.getNormalInt(1, 3) * 2 + 1;
        var room = new Room(rcx, rcy, rw, rh);
        if (room.getAllInternalAndBorderingCoords().every(function([x,y]) { return this.valid(x,y) && this.room(x,y) == null }, this)) {
            dug += rw * rh;
            this._rooms.push(room);
            room.getAllInternalCoords().forEach(function(xy) {
                var [x,y] = xy;
                this._room[x + ',' + y] = room;
                this._terrain[x + ',' + y] = new Terrain('floor');
            }, this);
        }
    }
    // Make a maze that connects the entire dungeon.
    var gridpoints = [];
    var frontier = [];
    var labels = {};
    for (var y = 1; y < this.height; y += 2) {
        for (var x = 1; x < this.width; x += 2) {
            gridpoints.push(x + ',' + y);
            frontier.push([x,y]);
            if (this.terrain(x,y).name == 'wall') {
                labels[x + ',' + y] = (y * this.width + x);
                this._terrain[x + ',' + y] = new Terrain('floor');
            } else {
                var r = this.room(x,y);
                labels[x + ',' + y] = (r._y * this.width + r._x);
            }
        }
    }
    while (frontier.length != 0) {
        var frontier_idx = ROT.RNG.getUniformInt(0, frontier.length-1);
        var [x,y] = frontier[frontier_idx];
        var oldlabel = labels[x + ',' + y];
        var adjs = [[x+2,y], [x-2,y], [x,y+2], [x,y-2]].randomize();
        var didsomething = false;
        for (var i=0; i < 4; ++i) {
            var [x2,y2] = adjs[i];
            var i2 = gridpoints.indexOf(x2 + ',' + y2);
            if (i2 != -1 && (labels[x2 + ',' + y2] != oldlabel)) {
                var newlabel = labels[x2 + ',' + y2];
                var x1 = Math.round((x + x2) / 2);
                var y1 = Math.round((y + y2) / 2);
                if (this.room(x,y) != null || this.room(x2,y2) != null) {
                    this._terrain[x1 + ',' + y1] = new Terrain('door');
                } else {
                    this._terrain[x1 + ',' + y1] = new Terrain('floor');
                }
                for (key in labels) {
                    if (labels[key] == oldlabel) {
                        labels[key] = newlabel;
                    }
                }
                didsomething = true;
                break;
            }
        }
        if (!didsomething) {
            // All its neighbors have been connected. Remove it from the set.
            frontier.splice(frontier_idx, 1);
        }
    }
    // Remove dead ends from the maze.
    var count_adjacent_nonwalls = function(x,y) {
        var count = 0;
        var adjs = [[x+1,y], [x-1,y], [x,y+1], [x,y-1]];
        for (var i=0; i < 4; ++i) {
            var [x1,y1] = adjs[i];
            if (this.valid(x1,y1) && this.terrain(x1,y1).name != 'wall') ++count;
        }
        return count;
    }.bind(this);
    while (true) {
        var didsomething = false;
        for (var y = 0; y < this.height; ++y) {
            for (var x = 0; x < this.width; ++x) {
                if (this.terrain(x,y).name != 'wall' && count_adjacent_nonwalls(x,y) == 1) {
                    this._terrain[x + ',' + y] = new Terrain('wall');
                    didsomething = true;
                }
            }
        }
        if (!didsomething) {
            break;
        }
    }
    // TODO: Try to sprout new features off from the existing map.
    // Classify corridors and intersections.
    while (true) {
        var didsomething = false;
        for (var y = 0; y < this.height; ++y) {
            for (var x = 0; x < this.width; ++x) {
                if (this.terrain(x,y).name != 'floor') continue;
                if (this.room(x,y) != null) continue;
                // Okay, this must be a new corridor.
                var corridor = new Corridor();
                this._rooms.push(corridor);
                var passable = function(x,y) {
                    return this.valid(x,y) && this._room[x+','+y] == null && count_adjacent_nonwalls(x,y) == 2;
                };
                var action = function(x,y) {
                    this._room[x + ',' + y] = corridor;
                    corridor._coords.push([x,y]);
                }
                action.bind(this)(x,y);
                this._flood_fill(x,y, passable.bind(this), action.bind(this));
                if (corridor.getAllInternalCoords().length == 1) {
                    corridor.markAsIntersection();
                }
            }
        }
        if (!didsomething) {
            break;
        }
    }
    // Subsume each door into one of its neighboring rooms.
    // This gets rid of one-cell "corridors" between rooms.
    // Past this point, the "coords" of rooms and corridors are meaningless;
    // this._room is the only source of truth about what-tiles-belong-to-which-rooms.
    for (var y = 0; y < this.height; ++y) {
        for (var x = 0; x < this.width; ++x) {
            if (this.terrain(x,y).name != 'door') continue;
            var adjs = [[x+1,y], [x-1,y], [x,y+1], [x,y-1]];
            for (var i=0; i < 4; ++i) {
                var [x1,y1] = adjs[i];
                if (this.valid(x1,y1) && (this.room(x1,y1) instanceof Room)) {
                    this._room[x + ',' + y] = this.room(x1,y1);
                    break;
                }
            }
        }
    }

    // TODO: Produce the neighboring-rooms-and-corridors graph.
    // Each room in this._rooms should have a notion of which other
    // rooms are "adjacent" to it, and in which semicardinal "direction"
    // each of its neighbors is.
    for (var i=0; i < this._rooms.length; ++i) {
        var room = this._rooms[i];
    }
};
Map.prototype._flood_fill = function(x,y, passable, action) {
    var adjs = [[x+1,y], [x-1,y], [x,y+1], [x,y-1]];
    for (var i=0; i < 4; ++i) {
        var [x1,y1] = adjs[i];
        if (passable(x1, y1)) {
            action(x1, y1);
            this._flood_fill(x1, y1, passable, action);
        }
    }
};

var Corridor = function() {
    this._coords = [];
    this._isIntersection = false;
};
Corridor.prototype.markAsIntersection = function() {
    this._isIntersection = true;
};
Corridor.prototype.description = function() {
    if (this._isIntersection) {
        return 'an intersection of two corridors';
    } else {
        return 'a corridor';
    }
};
Corridor.prototype.getAllInternalCoords = function() {
    return this._coords.slice();
};
Corridor.prototype.getAllInternalAndBorderingCoords = function() {
    var result = {};
    for (var i=0; i < this._coords.length; ++i) {
        var [x,y] = this._coords[i];
        result[(x-1) + ',' + (y-1)] = true;
        result[(x-1) + ',' + y] = true;
        result[(x-1) + ',' + (y+1)] = true;
        result[x + ',' + (y-1)] = true;
        result[x + ',' + y] = true;
        result[x + ',' + (y+1)] = true;
        result[(x+1) + ',' + (y-1)] = true;
        result[(x+1) + ',' + y] = true;
        result[(x+1) + ',' + (y+1)] = true;
    }
    var result2 = [];
    for (key in result) {
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);
        result2.push([x,y]);
    }
    return result2;
};
var Room = function(x, y, width, height) {
    this._x = x;
    this._y = y;
    this.width = width;
    this.height = height;
};
Room.prototype.description = function() {
    var size = 'small';
    if (this.width * this.height >= 20) {
        size = 'normal-sized';
    }
    if (this.width * this.height >= 45) {
        size = 'large';
    }
    return 'a ' + size + ' room';
};
Room.prototype.getAllInternalCoords = function() {
    var result = [];
    for (var x = 0; x < this.width; ++x) {
        for (var y = 0; y < this.height; ++y) {
            result.push([this._x + x, this._y + y]);
        }
    }
    return result;
};
Room.prototype.getAllInternalAndBorderingCoords = function() {
    var result = [];
    for (var x = -1; x < this.width+1; ++x) {
        for (var y = -1; y < this.height+1; ++y) {
            result.push([this._x + x, this._y + y]);
        }
    }
    return result;
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
        case 'door':
            this.appearance = ["'", 'brown'];
            this.blocksWalking = false;
            this.blocksSight = false;
            break;
    }
};
Terrain.prototype.the = function() {
    return 'the ' + this.name;
};
