#!/usr/bin/env node

var geocodify = require('./'),
    fs = require('fs'),
    binaryCSV = require('binary-csv'),
    stream = require('stream'),
    csvWriter = require('csv-write-stream'),
    argv = require('subarg')(process.argv.slice(2));

var mapid = argv.mapid || process.env.MAPBOX_MAPID;

var output = argv.output || 'csv';
argv.source = argv.source || 'mapbox';

if ((argv.source === 'mapbox' && !mapid) || argv.help || argv.h || (!argv._.length && process.stdin.isTTY)) {
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
    .pipe(geocodify(argv.source, addressFields, mapid))
    .pipe(transform)
    .pipe(encode)
    .pipe(process.stdout);

function help() {
    process.stdout.write(fs.readFileSync(__dirname + '/README.md'));
}
