var Item = function(x, y) {
    Actor.call(this, x, y);
    this.displayPriority = 1;
};
Item.prototype = new Actor();
Item.prototype.getSpeed = function() { return 0; };
