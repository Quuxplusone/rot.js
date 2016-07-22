var Creature = function(x, y, maxhp) {
    Actor.call(this, x, y);
    this.maxhp = maxhp;
    this.hp = maxhp;
};
Creature.prototype = new Actor();
Creature.prototype.whenHitBy = function(attacker) {};
Creature.prototype.costToPass = function(coord) {
    if (Game.map.terrain(coord.x, coord.y).movementCost == Infinity) {
        return Infinity;
    }
    var actors = Game.actors.filter(function(a) { return a != this && a instanceof Creature && a.coordEquals(coord); });
    if (actors.length) {
        return Infinity;
    }
    return Game.map.terrain(coord.x, coord.y).movementCost;
};
Creature.prototype.canPass = function(coord) { return this.costToPass(coord) != Infinity; };
Creature.prototype.canSee = function(defender) {
    var lightPasses = function(x,y) {
        return Game.map.valid(x,y) && (Game.map.terrain(x,y).translucence > 0);
    };
    var fov = new ROT.FOV.PreciseShadowcasting(lightPasses);
    var maxVisRadius = this.mooreDistanceTo(defender)+1;
    var vis = 0;
    fov.compute(this.x, this.y, maxVisRadius, function(x, y, r, value) {
        if (value !== 0) {
            if (x == defender.x && y == defender.y) {
                value *= Game.bresenhamTranslucence(this, {x:x,y:y}, function(x,y){ return Game.map.terrain(x,y).translucence; });
                vis += value;
            } else if (defender.manhattanDistanceTo({x:x,y:y}) == 1 && Game.map.terrain(x,y).isNatural) {
                value *= Game.bresenhamTranslucence(this, {x:x,y:y}, function(x,y){ return Game.map.terrain(x,y).translucence; });
                vis += value/10;
            }
        }
    }.bind(this));
    var visThreshold = 0.3 - 0.2*(this.hp / this.maxhp);
    return vis * (1 - defender.stealth) > visThreshold;
};
