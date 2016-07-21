var Human = function(x, y) {
    Creature.call(this, x, y, 100);
    this.stealth = 0;
    this.attacks = {
        'hit': {strength:function(){ return 2; }},
    };
};
Human.prototype = new Creature();
Human.prototype.the = function() { return "the park ranger"; };
Human.prototype.getAppearance = function() { return ['@', '#ddd', '#000']; };
Human.prototype.getSpeed = function() { return 10; };
Human.prototype.getNextAction = function() {
    var delta = randomDelta();
    if (this.canPass(this.coordPlus(delta))) {
        return new WalkAction(delta);
    } else {
        var dirs = [delta.deltaRotateLeft(), delta.deltaRotateRight()].randomize();
        if (this.canPass(this.coordPlus(dirs[0]))) {
            return new WalkAction(dirs[0]);
        } else if (this.canPass(this.coordPlus(dirs[1]))) {
            return new WalkAction(dirs[1]);
        } else {
            return new WaitAction();
        }
    }
    assert(false);
};

var Procompsognathus = function(x, y) {
    Creature.call(this, x, y, 10);
    this.stealth = 0.1;
    this.attacks = {
        'bite': {strength:function(){ return 5; }},
        'pinch': {strength:function(){ return 1; }},
    };
    this._speed = ROT.RNG.getUniformInt(7,11);
    this._predatorList = [];
};
Procompsognathus.prototype = new Creature();
Procompsognathus.prototype.the = function() { return 'the procompsognathus'; };
Procompsognathus.prototype.getAppearance = function() { return ['c', 'lightgreen']; };
Procompsognathus.prototype.getSpeed = function() { return this._speed; };
Procompsognathus.prototype._publicizePredator = function(attacker) {
    var proto = Object.getPrototypeOf(attacker);
    var flock = Game.actors.filter(function(actor) {
        return actor instanceof Procompsognathus && this.mooreDistanceTo(actor) <= 8 && actor.canSee(attacker);
    }.bind(this));
    for (var i=0; i < flock.length; ++i) {
        var list = flock[i]._predatorList;
        if (list.indexOf(proto) < 0) {
            console.log('publicized!', this, flock[i], proto);
            list.push(proto);
        }
    }
};
Procompsognathus.prototype.whenHitBy = function(attacker) {
    this._publicizePredator(attacker);
    this.setStrategy(new FleeStrategy(attacker));
};
Procompsognathus.prototype.getNextAction = function() {
    var s = this._strategy;
    if (this._strategy == null) {
        // Find a "flock" of nearby compys.
        // If there's no compy within 3 spaces, move toward the center of the flock.
        // If there's a compy within 1 space, move away from the center of the flock.
        // Otherwise, we'll fall back on exploring.
        //
        var flock = Game.actors.filter(function(actor) {
            return actor != this && actor instanceof Procompsognathus && this.mooreDistanceTo(actor) <= 8;
        }.bind(this));
        if (flock.length) {
            var center_of_flock = flock.averagePosition();
            if (flock.some(function(actor) { return this.mooreDistanceTo(actor) <= 1; }.bind(this))) {
                s = new MoveAwayFromStrategy(center_of_flock);
                this.setStrategy(null);
            } else if (this.mooreDistanceTo(center_of_flock) > 3) {
                s = new MoveTowardStrategy(center_of_flock);
                this.setStrategy(null);
            }
        }
    }
    if (s == null) {
        var dangers = Game.actors.filter(function (a) {
            var proto = Object.getPrototypeOf(a);
            return this._predatorList.indexOf(proto) >= 0 && this.mooreDistanceTo(a) <= 5 && this.canSee(a);
        }.bind(this));
        if (dangers.length) {
            s = new FleeStrategy(dangers[0]);
            this.setStrategy(s);
        }
    }
    if (s == null) {
        s = new ExploreStrategy(this);
        this.setStrategy(s);
    }
    assert(s != null);
    var action = s.getNextAction(this);
    if (action != null) {
        return action;
    } else {
        this.setStrategy(null);
        return new WaitAction();
    }
};

var Allosaurus = function(x, y) {
    Creature.call(this, x, y, 1000);
    this.stealth = 0;
    this.attacks = {
        'bite': {strength:function(){ return 50; }},
        'claw': {strength:function(){ return 5; }},
    };
    this._last_prey = null;
};
Allosaurus.prototype = new Creature();
Allosaurus.prototype.the = function() { return 'the allosaurus'; };
Allosaurus.prototype.getAppearance = function() { return ['A', 'red']; };
Allosaurus.prototype.getSpeed = function() { return 11; };
Allosaurus.prototype.whenHitBy = function(attacker) {
    if (this.hp > this.maxhp/2) {
        this.setStrategy(new HuntBySightStrategy(attacker));
    } else {
        this.setStrategy(new FleeStrategy(attacker));
    }
};
Allosaurus.prototype.getNextAction = function() {
    // Find a nearby and visible prey animal; chase it.
    if (this._strategy == null) {
        // Try to find a visible prey animal who's not our last prey.
        var targets = Game.actors.filter(function (prey) {
            return prey != this && prey != this._last_prey && prey.hp < this.hp && this.canSee(prey);
        }.bind(this));
        if (targets.length) {
            var prey = targets.random();
            this._last_prey = prey;
            this.setStrategy(new HuntBySightStrategy(prey));
        } else {
            this.setStrategy(new ExploreStrategy(this));
        }
    }
    assert(this._strategy != null);
    var action = this._strategy.getNextAction(this);
    if (action != null) {
        return action;
    } else {
        this.setStrategy(null);
        return new WaitAction();
    }
};


var Velociraptor = function(x, y) {
    Creature.call(this, x, y, 100);
    this.stealth = 0.3;
    this.attacks = {
        'slash':{strength:function(){ return 30; }},
        'bite':{strength:function(){ return 10; }},
        'claw':{strength:function(){ return 10; }},
    };
};
Velociraptor.prototype = new Creature();
Velociraptor.prototype.the = function() { return 'the velociraptor'; };
Velociraptor.prototype.getAppearance = function() { return ['v', '#252']; };
Velociraptor.prototype.getSpeed = function() { return 11; };
Velociraptor.prototype.whenHitBy = function(attacker) {
    if (this.hp > this.maxhp/2) {
        this.setStrategy(new HuntBySightStrategy(attacker));
    } else {
        this.setStrategy(new FleeStrategy(attacker));
    }
};
Velociraptor.prototype.getNextAction = function() {
    // Find a nearby and visible prey animal; chase it.
    if (this._strategy == null) {
        // Try to find a visible prey animal who's not our last prey.
        var targets = Game.actors.filter(function (prey) {
            return !(prey instanceof Velociraptor) && this.mooreDistanceTo(prey) < 5 && this.canSee(prey);
        }.bind(this));
        if (targets.length) {
            var prey = targets.random();
            // Tell the whole pack to go hunting.
            var pack = Game.actors.filter(function(actor) {
                return actor instanceof Velociraptor && this.mooreDistanceTo(actor) <= 10;
            }.bind(this));
            if (pack.length > 1 && this.currentlyVisibleToPlayer) {
                Game.alert('The velociraptor chitters.');
            }
            for (var i=0; i < pack.length; ++i) {
                pack[i].setStrategy(new HuntSmartlyStrategy(prey));
            }
        } else {
            // Find the nearest natural spot with a low average translucence and head for it.
            var fitnessOfTile = function(x,y) {
                var tile = Game.map.terrain(x,y);
                return (tile.isNatural ? 10 : 0) + 10*(1 - tile.translucence);
            };
            var fitnessOfSpot = function(x,y) {
                return fitnessOfTile(x,y) + fitnessOfTile(x+1,y) + fitnessOfTile(x-1,y) + fitnessOfTile(x,y+1) + fitnessOfTile(x,y-1);
            };
            var currentCover = fitnessOfSpot(this.x, this.y);
            var bestCover = null;
            var bestDist = Infinity;
            for (var x = this.x - 30; x < this.x + 30; ++x) {
                for (var y = this.y - 30; y < this.y + 30; ++y) {
                    if (Game.map.terrain(x,y).movementCost == Infinity) continue;
                    if (fitnessOfSpot(x,y) > currentCover) {
                        var dist = this.mooreDistanceTo({x:x,y:y});
                        if (dist < bestDist) {
                            bestCover = {x:x,y:y};
                            bestDist = dist;
                        }
                    }
                }
            }
            if (2 <= bestDist && bestDist < Infinity) {
                this.setStrategy(new ExploreStrategy(this, bestCover));
            } else {
                // Just explore at random.
                this.setStrategy(new ExploreStrategy(this));
            }
        }
    }
    assert(this._strategy != null);
    var action = this._strategy.getNextAction(this);
    if (action != null) {
        return action;
    } else {
        this.setStrategy(null);
        return new WaitAction();
    }
};
