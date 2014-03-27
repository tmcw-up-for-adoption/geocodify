# geocodify

Geocode streaming CSV data, producing CSV or GeoJSON.

## install

    npm install -g geocodify

## options

The input is either the first positional argument, like

    geocodify input.csv

Or a stream, like

    cat input.csv | geocodify

The output is always `stdout`. To write to a file, just

    geocodify input.csv > output.csv

The only currently supported input format is CSV

    input format
        --format={csv}

The input method will attempt to automatically choose fields that are
geographic. You can specify manual fields if you want:

    --addressfields [ afieldname anotherfield ]

Selecting `--output=geojson` encodes results as [GeoJSON](http://geojson.org/)

    output format
        --output={csv,geojson}

Use either [Mapbox](https://www.mapbox.com/) or the
[US Census](http://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.pdf) geocoder.
Using Mapbox requires either an environment variable called `MAPBOX_MAPID` pointing to a mapid, or a
command line `--mapid=youraccount.map` argument.

    geocoder
        --source={census,mapbox}

## use

Use the US Census (USA only)

    geocodify --source=census < file.csv > geocoded.csv

CSV to geocoded CSV

    geocodify < file.csv > geocoded.csv

CSV to GeoJSON to geojson.io

    npm install -g geojsonio-cli
    geocodify --output=geojson < file.csv | geojsonio

CSV to GeoJSON to KML

    npm install -g tokml
    geocodify --output=geojson < file.csv | tokml

Manually specify address fields

    geocodify --addressfields [ columnname othercolumn ] < atypical.csv
