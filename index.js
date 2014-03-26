#!/usr/bin/env node

var binaryCSV = require('binary-csv'),
    fs = require('fs'),
    xtend = require('xtend'),
    stream = require('stream'),
    http = require('http'),
    JSONStream = require('JSONStream'),
    through = require('through2'),
    concat = require('concat-stream'),
    argv = require('subarg')(process.argv.slice(2)),
    csvWriter = require('csv-write-stream');

var mapid = argv.mapid || process.env.MAPBOX_MAPID;

if (!mapid || argv.help || argv.h || (!argv._.length && process.stdin.isTTY)) {
    return help();
}

var throttle = 1000;
var source = argv._[0] && fs.createReadStream(argv._[0]) || process.stdin;

argv.format = argv.format || 'csv';
argv.output = argv.output || 'csv';

var encode, transform, addressFields = null;

if (argv.addressfields) {
    addressFields = argv.addressfields._;
}

if (argv.output == 'csv') {
    transform = new stream.PassThrough();
    encode = csvWriter();
} else if (argv.output == 'geojson') {
    transform = through.obj(function(obj, enc, callback) {
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
    });
    encode = JSONStream
        .stringify(
            '{"type":"FeatureCollection","features":[',
            ",",
            "]}");
}

if (argv.format == 'csv') {
    source
        .pipe(binaryCSV({json:true}))
        .pipe(through.obj(function(chunk, enc, callback) {
            geocode(address(chunk), function(err, center) {
                if (center) {
                    this.push(xtend(chunk, center));
                }
                setTimeout(callback, throttle);
            }.bind(this));
        }))
        .pipe(transform)
        .pipe(encode)
        .pipe(process.stdout);
}

function geocodeUrl(address) {
    return 'http://api.tiles.mapbox.com/v3/' +
        mapid + '/geocode/' +
        encodeURIComponent(address) + '.json';
}

function geocode(address, callback) {
    http.get(geocodeUrl(address), function(res) {
        res.pipe(concat(function(buf) {
            var data = JSON.parse(buf);
            if (data && data.results) {
                callback(null, {
                    lat: data.results[0][0].lat,
                    lon: data.results[0][0].lon
                });
            } else {
                callback('no result');
            }
        }));
    });
}

function address(o) {
    if (addressFields === null) {
        addressFields = Object.keys(o).filter(addressField);
        if (addressFields.length === 0) {
            help();
            throw new Error('no address fields specified and none autodetected.');
        }
    }
    return addressFields.map(function(key) {
        return o[key];
    }).join(' ');
}

function addressField(key) {
    return key.match(/address/) ||
        key.match(/city/) ||
        key.match(/street/) ||
        key.match(/country/) ||
        key.match(/zip/) ||
        key.match(/postcode/) ||
        key.match(/territory/) ||
        key.match(/province/) ||
        key.match(/nation/);
}

function help() {
    process.stdout.write(fs.readFileSync(__dirname + '/README.md'));
}
