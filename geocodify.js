#!/usr/bin/env node

var geocodify = require('./'),
    fs = require('fs'),
    binaryCSV = require('binary-csv'),
    stream = require('stream'),
    csvWriter = require('csv-write-stream'),
    through = require('through2'),
    JSONStream = require('JSONStream'),
    argv = require('subarg')(process.argv.slice(2));

argv.mapbox_mapid = argv.mapbox_mapid || process.env.MAPBOX_MAPID;
argv.here_app_id = argv.here_app_id || process.env.HEREAPPID;
argv.here_app_code = argv.here_app_code || process.env.HEREAPPCODE;

var output = argv.f || argv.output || 'csv';
argv.source = argv.s || argv.source || 'mapbox';

if (argv.r || argv.require) {
    geocodify.use(require(argv.r || argv.require));
}

if (argv.help || argv.h || (!argv._.length && process.stdin.isTTY)) {
    return help();
}

var source = argv._[0] && fs.createReadStream(argv._[0]) || process.stdin;

var addressFields;

if (argv.addressfields) {
    addressFields = argv.addressfields._;
}

if (output == 'csv') {
    transform = new stream.PassThrough({
        objectMode: true
    });
    encode = csvWriter();
} else if (output == 'geojson') {
    transform = through.obj(makePoint);
    encode = JSONStream
        .stringify(
            '{"type":"FeatureCollection","features":[',
            ",", "]}");
}

source
    .pipe(binaryCSV({json:true}))
    .pipe(geocodify(argv.source, addressFields, argv))
    .pipe(transform)
    .pipe(encode)
    .pipe(process.stdout);

function help() {
    process.stdout.write(fs.readFileSync(__dirname + '/README.md'));
}

function makePoint(obj, enc, callback) {
    var feature = {
        type: 'Feature',
        properties: obj,
        geometry: {
            type: 'Point',
            coordinates: [obj.lon, obj.lat]
        }
    };
    this.push(feature);
    callback();
}
