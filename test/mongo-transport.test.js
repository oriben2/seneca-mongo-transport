/* Copyright (c) 2014-2015 Richard Rodger */
'use strict'

var chai = require('chai');
var expect = chai.expect;
var TransportTest = require('seneca-transport-test')

describe('mongo-transport', function () {
  it('happy-any', function (done) {
    TransportTest.foo_test('./lib/index.js', require, done, 'mongo', -27017)
  });

  it('happy-pin', function (done) {
    TransportTest.foo_pintest('./lib/index.js', require, done, 'mongo', -27017)
  });
});
