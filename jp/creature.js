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
Creature.prototype.canSee = function(coord) {
    // TODO: maybe rewrite this to match how the player sees things?
    var lightPasses = function(x,y) {
        return Game.map.valid(x,y) && (Game.map.terrain(x,y).translucence > 0);
    };
    var fov = new ROT.FOV.PreciseShadowcasting(lightPasses);
    var maxVisRadius = this.mooreDistanceTo(coord)+1;
    var result = false;
    fov.compute(this.x, this.y, maxVisRadius, function(x, y, r, value) {
        if (x == coord.x && y == coord.y) {
            result = (value > 0.8);
        }
    });
    return result;
};
