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

var sources = {
    mapbox: function geocode(address, callback) {
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
        function geocodeUrl(address) {
            return 'http://api.tiles.mapbox.com/v3/' +
                mapid + '/geocode/' +
                encodeURIComponent(address) + '.json';
        }
    },
    geogratis: function geocode(address, callback) {
        http.get(geocodeUrl(address), function(res) {
            res.pipe(concat(function(buf) {
                var data = JSON.parse(buf);
                if (data && data.length > 0) {
                    callback(null, {
                        lat: data[0].geometry.coordinates[1],
                        lon: data[0].geometry.coordinates[0]
                    });
                } else {
                    callback('no result');
                }
            }));
        });
        function geocodeUrl(address) {
            return 'http://geogratis.gc.ca/services/geolocation/en/locate?q=' +
                encodeURIComponent(address)
                    // Geogratis' address format isn't very forgiving...
                    .replace(/canada/i, '').trim();
        }
    },
    census: function geocode(address, callback) {
        http.get(geocodeUrl(address), function(res) {
            res.pipe(concat(function(buf) {
                var data = JSON.parse(buf);
                if (data && data.result.addressMatches) {
                    callback(null, {
                        lat: data.result.addressMatches[0].coordinates.y,
                        lon: data.result.addressMatches[0].coordinates.x
                    });
                } else {
                    callback('no result');
                }
            }));
        });
        function geocodeUrl(address) {
            return 'http://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=' +
                encodeURIComponent(address) +
                '&benchmark=9&format=json';
        }
    },
    mapquestopen: function geocode(address, callback) {
        http.get(geocodeUrl(address), function(res) {
            res.pipe(concat(function(buf) {
                var data = JSON.parse(buf);
                if (data && data.length) {
                    callback(null, {
                        lat: data[0].lat,
                        lon: data[0].lon
                    });
                } else {
                    callback('no result');
                }
            }));
        });
        function geocodeUrl(address) {
            return 'http://open.mapquestapi.com/nominatim/v1/search.php?format=json&q=' +
                encodeURIComponent(address);
        }
    },
    twofishes: function geocode(address, callback) {
        http.get(geocodeUrl(address), function(res) {
            res.pipe(concat(function(buf) {
                var data = JSON.parse(buf);
                if (data &&
                    data.interpretations &&
                    data.interpretations.length &&
                    data.interpretations[0].feature.geometry &&
                    data.interpretations[0].feature.geometry.center) {
                    callback(null, {
                        lat: data.interpretations[0].feature.geometry.center.lat,
                        lon: data.interpretations[0].feature.geometry.center.lng
                    });
                } else {
                    callback('no result');
                }
            }));
        });
        function geocodeUrl(address) {
            return 'http://demo.twofishes.net/?query=' +
                encodeURIComponent(address);
        }
    }
};

var mapid = argv.mapid || process.env.MAPBOX_MAPID;

argv.format = argv.format || 'csv';
argv.output = argv.output || 'csv';
argv.source = argv.source || 'mapbox';

if ((argv.source === 'mapbox' && !mapid) || argv.help || argv.h || (!argv._.length && process.stdin.isTTY)) {
    return help();
}

var throttle = 1000;
var source = argv._[0] && fs.createReadStream(argv._[0]) || process.stdin;

var encode, transform, addressFields = null;

if (argv.addressfields) {
    addressFields = argv.addressfields._;
}

if (!sources[argv.source]) {
    help();
    throw new Error('source ' + argv.source + ' not found');
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
            sources[argv.source](address(chunk), function(err, center) {
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
