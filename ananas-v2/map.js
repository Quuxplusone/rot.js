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
    var result = this._room[x + ',' + y];
    if (result != null) {
        assert(this.terrain(x,y).name != 'wall', 'x='+x+',y='+y+',terrain='+this.terrain(x,y).name);
    }
    return result;
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
    console.log('Remove dead ends from the maze');
    var get_adjacent_coords = function(x,y) {
        return [[x+1,y], [x-1,y], [x,y+1], [x,y-1]];
    };
    var count_adjacent_nonwalls = function(x,y) {
        var count = 0;
        var adjs = get_adjacent_coords(x,y);
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
                    this._room[x + ',' + y] = null;
                    didsomething = true;
                }
            }
        }
        if (!didsomething) {
            break;
        }
    }
    // TODO: Try to sprout new features off from the existing map.

    // ...

    // Classify corridors and intersections.
    console.log('Classify corridors and intersections');
    for (var y = 0; y < this.height; ++y) {
        for (var x = 0; x < this.width; ++x) {
            if (this.terrain(x,y).name == 'floor' && this.room(x,y) == null) {
                var adjacent_floors = count_adjacent_nonwalls(x,y);
                if (adjacent_floors == 2) {
                    // Okay, this must be a new corridor.
                    var corridor = new Corridor(x,y);
                    this._rooms.push(corridor);
                    var passable = function(x,y) {
                        return this.valid(x,y) && this.room(x,y) == null && this.terrain(x,y).name != 'wall' && count_adjacent_nonwalls(x,y) == 2;
                    }.bind(this);
                    var action = function(x,y) {
                        this._room[x + ',' + y] = corridor;
                    }.bind(this);
                    action(x,y);
                    this._flood_fill(x,y, passable, action);
                } else {
                    var intersection = new Intersection(x,y);
                    this._rooms.push(intersection);
                    this._room[x+','+y] = intersection;
                }
            }
        }
    }
    // Subsume each door into one of its neighboring rooms.
    // This gets rid of one-cell "corridors" between rooms.
    console.log('Subsume doors into rooms');
    for (var y = 0; y < this.height; ++y) {
        for (var x = 0; x < this.width; ++x) {
            if (this.terrain(x,y).name != 'door') continue;
            var adjs = get_adjacent_coords(x,y);
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
    // each of its neighbors is. The algorithm is just to iterate over
    // the Rooms and Intersections and look for their exits.
    console.log('Get neighbors of rooms');
    for (var ri = 0; ri < this._rooms.length; ++ri) {
        var room = this._rooms[ri];
        if (room instanceof Room) {
            var northern_neighbors = [];
            var southern_neighbors = [];
            var eastern_neighbors = [];
            var western_neighbors = [];
            for (var x = 0; x < room.width; ++x) {
                if (this.terrain(room._x + x, room._y - 1).name == 'door') {
                    var r = this.room(room._x + x, room._y - 1);
                    if (r == room) { r = this.room(room._x + x, room._y - 2); }
                    northern_neighbors.push(r);
                }
                if (this.terrain(room._x + x, room._y + room.height).name == 'door') {
                    var r = this.room(room._x + x, room._y + room.height);
                    if (r == room) { r = this.room(room._x + x, room._y + room.height + 1); }
                    southern_neighbors.push(r);
                }
            }
            for (var y = 0; y < room.height; ++y) {
                if (this.terrain(room._x - 1, room._y + y).name == 'door') {
                    var r = this.room(room._x - 1, room._y + y);
                    if (r == room) { r = this.room(room._x - 2, room._y + y); }
                    western_neighbors.push(r);
                }
                if (this.terrain(room._x + room.width, room._y + y).name == 'door') {
                    var r = this.room(room._x + room.width, room._y + y);
                    if (r == room) { r = this.room(room._x + room.width + 1, room._y + y); }
                    eastern_neighbors.push(r);
                }
            }
            var populate = function(nn, card, semi1, semi2) {
                if (nn.length == 0) {
                    // do nothing
                } else if (nn.length == 1) {
                    room.neighbors[card] = nn[0];
                } else if (nn.length == 2) {
                    room.neighbors[semi1] = nn[0];
                    room.neighbors[semi2] = nn[1];
                } else {
                    room.neighbors[semi1] = nn[0];
                    room.neighbors[card] = nn[1];
                    room.neighbors[semi2] = nn[2];
                }
            };
            populate(northern_neighbors, Dir.NORTH, Dir.NW, Dir.NE);
            populate(southern_neighbors, Dir.SOUTH, Dir.SW, Dir.SE);
            populate(eastern_neighbors, Dir.EAST, Dir.NE, Dir.SE);
            populate(western_neighbors, Dir.WEST, Dir.NW, Dir.SW);
        } else if (room instanceof Intersection) {
            var [x,y] = room.centroid;
            assert(this.room(x,y) == room);
            var adjs = [[x+1,y,Dir.EAST,Dir.WEST], [x-1,y,Dir.WEST,Dir.EAST], [x,y+1,Dir.SOUTH,Dir.NORTH], [x,y-1,Dir.NORTH,Dir.SOUTH]];
            for (var i=0; i < 4; ++i) {
                var [x1,y1,d01,d10] = adjs[i];
                if (!this.valid(x1,y1)) continue;
                var r1 = this.room(x1,y1);
                if (r1 != null) {
                    room.neighbors[d01] = r1;
                    r1.neighbors[d10] = room;
                }
            }
        } else if (room instanceof Corridor) {
            var [x,y] = [room._x, room._y];
            assert(this.room(x,y) == room);
            var [ox,oy] = [x,y];
            var n1 = null;
            while (true) {
                var moved = false;
                var adjs = get_adjacent_coords(x,y);
                for (var i=0; i < 4; ++i) {
                    var [nx,ny] = adjs[i];
                    if ((nx != ox || ny != oy) && this.valid(nx,ny)) {
                        if (this.room(nx,ny) == room) {
                            [ox,oy] = [x,y];
                            [x,y] = [nx,ny];
                            moved = true;
                            break;
                        } else if (this.room(nx,ny) != null) {
                            n1 = this.room(nx,ny);
                        }
                    }
                }
                if (!moved) break;
            }
            assert(n1 != null);
            assert(!(n1 instanceof Corridor));
            // We've found one endpoint of the corridor.
            var [e1x,e1y] = [x,y];
            [ox,oy] = [x,y];
            var n2 = null;
            var corridor_length = 1;
            while (true) {
                var moved = false;
                var adjs = get_adjacent_coords(x,y);
                for (var i=0; i < 4; ++i) {
                    var [nx,ny] = adjs[i];
                    if ((nx != ox || ny != oy) && this.valid(nx,ny)) {
                        if (this.room(nx,ny) == room) {
                            [ox,oy] = [x,y];
                            [x,y] = [nx,ny];
                            corridor_length += 1;
                            moved = true;
                            break;
                        } else if (this.room(nx,ny) != null) {
                            n2 = this.room(nx,ny);
                        }
                    }
                }
                if (!moved) break;
            }
            // We've found the other end, and the length.
            assert(n2 != null);
            assert(!(n2 instanceof Corridor));
            var [e2x,e2y] = [x,y];
            // Now start at end 2, and take length/2 steps toward end 1.
            var steps = Math.floor(corridor_length/2);
            [ox,oy] = [x,y];
            while (steps != 0) {
                var moved = false;
                var adjs = [[x+1,y,Dir.WEST,Dir.EAST], [x-1,y,Dir.EAST,Dir.WEST], [x,y+1,Dir.NORTH,Dir.SOUTH], [x,y-1,Dir.SOUTH,Dir.NORTH]];
                for (var i=0; i < 4; ++i) {
                    var [nx,ny,dir2,dir1] = adjs[i];
                    if ((nx != ox || ny != oy) && this.valid(nx,ny) && this.room(nx,ny) == room) {
                        [ox,oy] = [x,y];
                        [x,y] = [nx,ny];
                        steps -= 1;
                        moved = true;
                        if (steps == 0) {
                            assert(n2 != null);
                            room.neighbors[dir2] = n2;
                            var badjs = [[x+1,y,Dir.WEST,Dir.EAST], [x-1,y,Dir.EAST,Dir.WEST], [x,y+1,Dir.NORTH,Dir.SOUTH], [x,y-1,Dir.SOUTH,Dir.NORTH]];
                            for (var bi=0; bi < 4; ++bi) {
                                [nx,ny,dir2,dir1] = badjs[bi];
                                if ((nx != ox || ny != oy) && this.valid(nx,ny) && this.room(nx,ny) == room) {
                                    assert(n1 != null);
                                    room.neighbors[dir1] = n1;
                                    break;
                                }
                            }
                        }
                        break;
                    }
                }
                if (!moved) break;
            }
            room.centroid = [x,y];
            room.corridor_length = corridor_length;
            assert(this.room(x,y) == room);
            assert(Object.keys(this.neighbors).length == 2);
        }
    }
    console.log('Sanity-check all the rooms before finishing');
    for (var ri = 0; ri < this._rooms.length; ++ri) {
        var room = this._rooms[ri];
        assert(room.centroid.length == 2);
        for (key in room.neighbors) {
            assert(room.neighbors[key] instanceof Room || room.neighbors[key] instanceof Intersection || room.neighbors[key] instanceof Corridor, room.neighbors[key]);
        }
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

var Corridor = function(x,y) {
    this._x = x;
    this._y = y;
    this.centroid = null;
    this.neighbors = {};
    this.corridor_length = null;
};
Corridor.prototype.description = function() {
    var dirs = Object.keys(this.neighbors);
    assert(dirs.length == 2);
    assert(this.corridor_length != null);
    if (this.corridor_length <= 2) {
        return 'a short corridor with exits to %s and %s'.format(dirs[0], dirs[1]);
    } else if (this.corridor_length <= 7) {
        return 'a corridor with exits to %s and %s'.format(dirs[0], dirs[1]);
    } else {
        return 'a long and winding corridor with exits to %s and %s'.format(dirs[0], dirs[1]);
    }
};

var Intersection = function(x,y) {
    this.centroid = [x,y];
    this.neighbors = {};
};
Intersection.prototype.description = function() {
    if (Dir.NORTH in this.neighbors && Dir.SOUTH in this.neighbors) {
        if (Dir.EAST in this.neighbors) {
            if (Dir.WEST in this.neighbors) {
                return 'the intersection of a north-south corridor and an east-west corridor';
            } else {
                return 'the intersection of a north-south corridor with a corridor leading east';
            }
        } else if (Dir.WEST in this.neighbors) {
            return 'the intersection of a north-south corridor with a corridor leading west';
        } else {
            assert(false);
        }
    } else if (Dir.EAST in this.neighbors && Dir.WEST in this.neighbors) {
        if (Dir.NORTH in this.neighbors) {
            assert(!(Dir.SOUTH in this.neighbors));
            return 'the intersection of an east-west corridor with a corridor leading north';
        } else if (Dir.SOUTH in this.neighbors) {
            return 'the intersection of an east-west corridor with a corridor leading south';
        } else {
            assert(false);
        }
    } else {
        assert(false);
    }
    return 'an intersection';
};

var Room = function(x, y, width, height) {
    this._x = x;
    this._y = y;
    this.width = width;
    this.height = height;
    this.centroid = [this._x + Math.floor(this.width / 2), this._y + Math.floor(this.height / 2)];
    this.neighbors = {};
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
