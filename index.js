'use strict';
var assert = require('assert');
module.exports = function(ast, DEBUG, types) {

  var n = types.namedTypes;
  var b = types.builders;

  function unblockReplace(path, node) {
    if (n.BlockStatement.check(node)) {
      path.replace.apply(path, node.body);
    } else {
      path.replace(node);
    }
  }

  var DebugMemberExpression = new types.Type(function(node) {
    return (
      n.MemberExpression.check(node) &&
      //!node.computed &&
      n.Identifier.check(node.object) &&
      'DEBUG' === node.object.name &&
      (n.Identifier.check(node.property) || n.Literal.check(node.property))
    );
  }, 'MemberExpression (debug)');

  function getDebugMemberExpValue(node) {
    DebugMemberExpression.assert(node);

    var propertyName;
    if (n.Identifier.check(node.property)) {
      propertyName = node.property.name;
    } else {
      n.Literal.assert(node.property);
      propertyName = node.property.value;
    }

    if (DEBUG.hasOwnProperty(propertyName)) {
      return DEBUG[propertyName];
    }
    return false; // TODO: ??? Log this?? Throw an Error?
  }

  return types.visit(ast, {
    visitIfStatement: VisitBranch ,
    visitConditionalExpression: VisitBranch,
    visitLogicalExpression: function(path) {
      var node = this.traverse(path);
      if (node.operator === '&&') {
        if (n.Literal.check(node.left)) {
          path.replace(node.left.value ? node.right : node.left);
        }
      } else {
        assert.strictEqual(node.operator, '||');
        if (n.Literal.check(node.left)) {
          path.replace(node.left.value ? node.left : node.right);
        }
      }
    },
    visitMemberExpression: function(path) {
      var node = this.traverse(path);
      if (DebugMemberExpression.check(node)) {
        path.replace(b.literal(getDebugMemberExpValue(node)));
      }
      return false;
    }
  });

  function VisitBranch(path) {
    var test = this.visit(path.get('test'));
    var alternate = path.get('alternate');
    var consequent = path.get('consequent');

    if (n.Literal.check(test)) {
      unblockReplace(path, this.visit(test.value ? consequent : alternate));
    } else {
      this.visit(consequent);
      this.visit(alternate);
    }
  }
};
