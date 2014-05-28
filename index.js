var xtend = require('xtend'),
    stream = require('stream'),
    http = require('http'),
    through = require('through2'),
    concat = require('concat-stream');

var throttle = 1000;

var sources = {
    mapbox: function geocode(address, options, callback) {
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
                options.mapbox_mapid + '/geocode/' +
                encodeURIComponent(address) + '.json';
        }
    },
    geogratis: function geocode(address, options, callback) {
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
    census: function geocode(address, options, callback) {
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
    mapquestopen: function geocode(address, options, callback) {
        http.get(geocodeUrl(address), function(res) {
            res.pipe(concat(function(buf) {
                var data = JSON.parse(buf);
                if (data && data.length) {
                    callback(null, {
                        lat: parseFloat(data[0].lat),
                        lon: parseFloat(data[0].lon)
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
    twofishes: function geocode(address, options, callback) {
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

module.exports = function(source, addressFields, options) {
    if (!sources[source]) throw new Error('Source not found');

    function address(o) {
        if (addressFields === undefined) {
            addressFields = Object.keys(o).filter(addressField);
            if (addressFields.length === 0) return null;
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

    return through.obj(function(chunk, enc, callback) {
        var addresses = address(chunk);
        if (addresses === null) {
            return this.emit('error', new Error('No addresses provided or found in input data'));
        }
        sources[source](addresses, options, function(err, center) {
            if (center) {
                this.push(xtend(chunk, center));
            }
            setTimeout(callback, throttle);
        }.bind(this));
    });
};

module.exports.use = function(source) {
    sources[source.name] = source.fn;
};
