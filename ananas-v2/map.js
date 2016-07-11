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
        return [[x+1,y,Dir.EAST,Dir.WEST], [x-1,y,Dir.WEST,Dir.EAST], [x,y+1,Dir.SOUTH,Dir.NORTH], [x,y-1,Dir.NORTH,Dir.SOUTH]];
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
                var [x1,y1,d1] = adjs[i];
                if (!this.valid(x1,y1)) continue;
                var r1 = this.room(x1,y1);
                if (r1 != null) {
                    room.neighbors[d1] = r1;
                }
            }
        } else if (room instanceof Corridor) {
            // Find the two endpoints of this corridor.
            // Notice that some corridors are only 1 tile long, so they have only one "endpoint".
            var count_adjacent_corridors = function(x,y) {
                var count = 0;
                var adjs = get_adjacent_coords(x,y);
                for (var i=0; i < 4; ++i) {
                    var [x1,y1] = adjs[i];
                    if (this.valid(x1,y1) && this.room(x1,y1) == room) ++count;
                }
                return count;
            }.bind(this);
            var [e1x,e1y] = [null,null];
            var [e2x,e2y] = [null,null];
            for (var x = 0; x < this.width; ++x) {
                for (var y = 0; y < this.height; ++y) {
                    if (this.room(x,y) == room) {
                        var count = count_adjacent_corridors(x,y);
                        if (count == 0) {
                            // It's a 1-tile corridor.
                            [e1x,e1y] = [x,y];
                            [e2x,e2y] = [x,y];
                        } else if (count == 1) {
                            if (e1x == null) {
                                [e1x,e1y] = [x,y];
                            } else {
                                assert(e2x == null);
                                [e2x,e2y] = [x,y];
                            }
                        }
                    }
                }
            }
            assert(e1x != null && e2x != null, 'bad es');

            var [n1,dir1] = [null,null];
            var [n2,dir2] = [null,null];
            var adjs = get_adjacent_coords(e1x,e1y);
            for (var i=0; i < 4; ++i) {
                var [x1,y1,d1] = adjs[i];
                if (this.valid(x1,y1) && this.room(x1,y1) != null && this.room(x1,y1) != room) {
                    if (n1 == null) {
                        n1 = this.room(x1,y1);
                        dir1 = d1;
                    } else {
                        n2 = this.room(x1,y1);
                        dir2 = d1;
                    }
                }
            }
            assert(n1 != null && dir1 != null);
            var adjs = get_adjacent_coords(e2x,e2y);
            for (var i=0; i < 4; ++i) {
                var [x1,y1,d1] = adjs[i];
                if (this.valid(x1,y1) && this.room(x1,y1) != null && this.room(x1,y1) != room) {
                    if (n1 == null) {
                        n1 = this.room(x1,y1);
                        dir1 = d1;
                    } else {
                        n2 = this.room(x1,y1);
                        dir2 = d1;
                    }
                }
            }
            assert(n1 != null && n2 != null);
            assert(dir1 != null && dir2 != null);
            // Step the two endpoints toward each other until they meet.
            room.corridor_twists = 0;
            room.corridor_length = 1;
            while (true) {
                if (e1x == e2x && e1y == e2y) break;
                var adjs = get_adjacent_coords(e1x,e1y);
                for (var i=0; i < 4; ++i) {
                    var [x1,y1,d1,d2] = adjs[i];
                    if (d1 != dir1 && this.valid(x1,y1) && this.room(x1,y1) == room) {
                        [e1x,e1y] = [x1,y1];
                        if (dir1 != d2) { room.corridor_twists += 1; }
                        dir1 = d2;
                        room.corridor_length += 1;
                        break;
                    }
                }
                if (e1x == e2x && e1y == e2y) break;
                var adjs = get_adjacent_coords(e2x,e2y);
                for (var i=0; i < 4; ++i) {
                    var [x1,y1,d1,d2] = adjs[i];
                    if (d1 != dir2 && this.valid(x1,y1) && this.room(x1,y1) == room) {
                        [e2x,e2y] = [x1,y1];
                        if (dir2 != d2) { room.corridor_twists += 1; }
                        dir2 = d2;
                        room.corridor_length += 1;
                        break;
                    }
                }
            }
            assert(e1x == e2x && e1y == e2y);
            assert(this.room(e1x,e1y) == room);
            assert(dir1 != dir2 && dir1 != null && dir2 != null);
            room.centroid = [e1x,e1y];
            room.neighbors[dir1] = n1;
            room.neighbors[dir2] = n2;
            assert(Object.keys(room.neighbors).length == 2);
        } else {
            assert(false, 'Unexpected object type in this._rooms');
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
    dirs.sort(Dir.cmp);
    assert(this.corridor_length != null);
    if (this.corridor_twists >= 3) {
        if (this.corridor_length <= 2) {
            return 'a short twisty corridor with exits to %s and %s'.format(dirs[0], dirs[1]);
        } else if (this.corridor_length <= 7) {
            return 'a winding corridor with exits to %s and %s'.format(dirs[0], dirs[1]);
        } else {
            return 'a long and winding corridor with exits to %s and %s'.format(dirs[0], dirs[1]);
        }
    } else {
        if (this.corridor_length <= 2) {
            return 'a short corridor with exits to %s and %s'.format(dirs[0], dirs[1]);
        } else if (this.corridor_length <= 7) {
            return 'a corridor with exits to %s and %s'.format(dirs[0], dirs[1]);
        } else {
            return 'a long corridor with exits to %s and %s'.format(dirs[0], dirs[1]);
        }
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

    ROT.RNG.setSeed(1000 * (this._y * Game.map.width + this._x) + (this.width * 10 + this.height));
    this._rng = ROT.RNG.clone();
    this._description = function(r) {
        var desc = [
            'a%s room hewn from dark rock',
            'a%%s room paneled in %s'.format(['sequoia wood', 'dark wood', 'ebony', 'mahogany'].random()),
            'a%%s room whose walls are inlaid with %s'.format(['silver spirals', 'patterned gold', 'precious gems', 'ebony and ivory'].random()),
            'a%s room lined with graven images',
            'a%%s room with %s marks on the walls'.format(['odd', 'disturbing', 'bloody', 'axe', 'pick-axe'].random()),
            'a%%s room with a %s ceiling'.format(['low', 'high'].random()),
            'a%%s room smelling of %s'.format(['incense', 'damp moss'].random()),
            'a%s room covered in beautiful stalactites',
            'a%s room whose ceiling dips almost to the floor in places',
            'a%%s room whose walls are covered with %s'.format(['primitive cave drawings', 'masses of ivy', 'glowing moss', 'a thin film of water'].random()),
            'a%s room',
        ].random();
        if (r.width * r.height <= 18) {
            desc = desc.format([' small', ' cramped', ' tiny'].random());
        } else if (r.width * r.height <= 44) {
            desc = desc.format([''].random());
            desc = desc.replace(/^a, /, 'a ');
        } else if (r.width * r.height <= 55) {
            desc = desc.format([' big', ' large'].random());
        } else {
            desc = desc.format(['n enormous', 'n immense', ' majestic', ' giant'].random());
        }
        return desc;
    }(this);
};
Room.prototype.description = function() {
    var rng = this._rng.clone();
    var p = rng.getPercentage();
    var desc = this._description;
    var allowWith = !(desc.indexOf('with') != -1 || desc.indexOf('whose') != -1);

    var dirs = Object.keys(this.neighbors);
    dirs.sort(Dir.cmp);
    assert(dirs.length >= 1);
    if (dirs.length == 1) {
        if (rng.getPercentage() < 50 && allowWith) {
            if (p <= 100) {
                desc += ' with a%s %s to the %s'.format([' single', ' solitary', ''].random(), ['door', 'exit'].random(), dirs[0]);
            }
        } else {
            if (p < 25) {
                desc += '. The %s exit is a door to the %s'.format(['sole', 'solitary', 'only'].random(), dirs[0]);
            } else if (p < 50) {
                desc += '. The %s exit is to the %s'.format(['sole', 'solitary', 'only'].random(), dirs[0]);
            } else if (p < 75) {
                desc += '. The %s exit is %s'.format(['sole', 'solitary', 'only'].random(), dirs[0]);
            } else {
                desc += '. A%s door leads %s'.format([' single', ' solitary', ''].random(), dirs[0]);
            }
        }
    } else if (dirs.length == 2) {
        if (rng.getPercentage() < 50 && allowWith) {
            if (p < 30) {
                desc += ' with doors to %s and %s'.format(dirs[0], dirs[1]);
            } else if (p < 60) {
                desc += ' with exits to %s and %s'.format(dirs[0], dirs[1]);
            } else {
                desc += ' with a door to the %s and another to the %s'.format(dirs[0], dirs[1]);
            }
        } else {
            if (p < 50) {
                desc += '. %s lead %s and %s'.format(['Doors', 'Exits'].random(), dirs[0], dirs[1]);
            } else if (p < 70) {
                desc += '. The only exits are %s and %s'.format(dirs[0], dirs[1]);
            } else if (p < 80) {
                desc += '. The only exits are doors leading %s and %s'.format(dirs[0], dirs[1]);
            } else {
                desc += '. There is %s to the %s and another to the %s'.format(['a door', 'an exit'].random(), dirs[0], dirs[1]);
            }
        }
    } else {
        var dirs_as_string = dirs.slice(0,-1).join(', ') + ', and ' + dirs[dirs.length-1];
        if (rng.getPercentage() < 50 && allowWith) {
            if (p < 101) {
                desc += ' with %s to %s'.format(['doors', 'exits'].random(), dirs_as_string);
            }
        } else {
            if (p < 101) {
                desc += '. %s lead %s'.format(['Doors', 'Exits'].random(), dirs_as_string);
            }
        }
    }
    return desc;
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
