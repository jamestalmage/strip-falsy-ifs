'use strict';
var assert = require('assert');
var stripFalsyIfs = require('../');
var recast = require('recast');

describe('strip-falsy-ifs', function() {

  function transform(s, DEBUG) {
    var ast = recast.parse(s);
    DEBUG = DEBUG || {truthy: true, falsy: false};
    ast = stripFalsyIfs(ast, DEBUG, recast.types);
    return recast.print(ast).code;
  }

  it('DEBUG.XXX', function() {
    assert.equal(transform('DEBUG.truthy;'), 'true;');
    assert.equal(transform('DEBUG.falsy;'), 'false;');
    assert.equal(transform('a.DEBUG.falsy;'), 'a.DEBUG.falsy;');
    assert.equal(transform('a.DEBUG.truthy;'), 'a.DEBUG.truthy;');
  });

  it('truthy/falsy values', function() {
    var code = [
      'if (DEBUG.truthy) {',
      '  console.log(\'a\');',
      '}',
      'if (DEBUG.falsy) {',
      '  console.log(\'b\');',
      '}'
    ].join('\n');

    assert.equal(transform(code), 'console.log(\'a\');');
  });

  it('else branch (truthy)', function() {
    var code = [
      'if (DEBUG.truthy) {',
      '  console.log(\'a\');',
      '} else {',
      '  console.log(\'b\');',
      '}'
    ].join('\n');

    assert.equal(transform(code), 'console.log(\'a\');');
  });

  it('else branch (falsy)', function() {
    var code = [
      'if (DEBUG.falsy) {',
      '  console.log(\'a\');',
      '} else {',
      '  console.log(\'b\');',
      '}'
    ].join('\n');

    assert.equal(transform(code), 'console.log(\'b\');');
  });

  it('nested', function() {
    var code = [
      'if (DEBUG.falsy) {',
      '  if (DEBUG.truthy) {',
      '    console.log(\'a\');',
      '  } else {',
      '    console.log(\'b\');',
      '  }',
      '} else {',
      '  if (DEBUG.truthy) {',
      '    console.log(\'c\');',
      '  } else {',
      '    console.log(\'d\');',
      '  }',
      '}'
    ].join('\n');

    assert.equal(transform(code), 'console.log(\'c\');');
  });

  it('non DEBUG if statements', function() {
    var code = [
      'if (foo) {',
      '  if (DEBUG.falsy) {',
      '    bar();',
      '  } else {',
      '    baz();',
      '  }',
      '}'
    ].join('\n');

    var expected = [
      'if (foo) {',
      '  baz();',
      '}'
    ].join('\n');

    assert.equal(transform(code), expected);
  });

  it('conditional expressions', function() {
    var code = "var result = DEBUG.a ? 'a' : DEBUG.b ? 'b' : 'c';";
    assert.equal(transform(code, {b:true}), "var result = 'b';");
    assert.equal(transform(code, {a:true}), "var result = 'a';");
    assert.equal(transform(code, {}), "var result = 'c';");
  });

  it('computed constant values', function() {
    var code = "a = DEBUG['foo-bar'];";
    assert.equal(transform(code, {'foo-bar':'baz'}), 'a = "baz";');
  });

  it('computed value with nesting', function() {
    var code = "a = DEBUG[DEBUG.foo ? 'bar' : 'baz'];";
    assert.equal(transform(code, {foo:1, bar:2, baz: 3}), 'a = 2;');
    assert.equal(transform(code, {foo:0, bar:2, baz: 3}), 'a = 3;');
  });

  it('if (literal || ??)', function() {
    var code = [
      'if(DEBUG.a || a()) {',
      '  c();',
      '} else {',
      '  d();',
      '}'
    ].join('\n');

    assert.equal(transform(code, {a:1}), 'c();');

    var expected = [
      'if(a()) {',
      '  c();',
      '} else {',
      '  d();',
      '}'
    ].join('\n');

    assert.equal(transform(code, {a:0}), expected);
  });

  it('if (literal && ??)', function() {
    var code = [
      'if(DEBUG.a && a()) {',
      '  c();',
      '} else {',
      '  d();',
      '}'
    ].join('\n');

    assert.equal(transform(code, {a:0}), 'd();');

    var expected = [
      'if(a()) {',
      '  c();',
      '} else {',
      '  d();',
      '}'
    ].join('\n');

    assert.equal(transform(code, {a:1}), expected);
  });

  xit('ENV', function() {
    var code = [
      'if (ENV) ',
      '  a();',
      ' else ',
      '  b();'
    ].join('\n');

    assert.equal(transform(code, {ENV:true}), 'a();');
    assert.equal(transform(code, {ENV:false}), 'b();');
  });
});
