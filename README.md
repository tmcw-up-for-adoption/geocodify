# geocodify

Geocode streaming CSV data, producing GeoJSON. Requires either
an environment variable called `MAPBOX_MAPID` pointing to a mapid, or a
command line `--mapid=youraccount.map` argument.

## install

    npm install -g geocodify

## options

    input format

        --format={csv}

    output format

        --output={csv,geojson}

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
