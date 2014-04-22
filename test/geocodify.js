var test = require('tap').test,
    geocodify = require('../');

test('census', function(t) {
    geocodify('census')
        .on('data', function(data) {
            t.deepEqual(
                data,
                require('./output.census.json'));
            t.end();
        })
        .write(require('./input.json'));
});

test('mapquest-open', function(t) {
    geocodify('mapquestopen')
        .on('data', function(data) {
            t.deepEqual(
                data,
                require('./output.mapquestopen.json'));
            t.end();
        })
        .write(require('./input.json'));
});

test('twofishes', function(t) {
    geocodify('twofishes')
        .on('data', function(data) {
            t.deepEqual(
                data,
                require('./output.twofishes.json'));
            t.end();
        })
        .write(require('./input.json'));
});

test('no address fields found', function(t) {
    geocodify('census')
        .on('error', function(err) {
            t.equal(
                err.message,
                'No addresses provided or found in input data');
            t.end();
        })
        .write({});
});

test('source not found', function(t) {
    t.throws(function() {
        geocodify('blahblah');
    }, 'Source not found');
    t.end();
});
