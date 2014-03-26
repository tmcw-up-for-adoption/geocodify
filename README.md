# geocodify

Geocode streaming CSV data, producing GeoJSON. Requires either
an environment variable called `MAPBOX_MAPID` pointing to a mapid, or a
command line `--mapid=youraccount.map` argument.

usage:

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
