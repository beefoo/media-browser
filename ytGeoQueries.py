# -*- coding: utf-8 -*-

import argparse
import sys

from lib import *

# input
parser = argparse.ArgumentParser()
parser.add_argument('-in', dest="INPUT_FILE", default="data/simplemaps_worldcities_basicv1.5.csv", help="Input csv file")
parser.add_argument('-lstep', dest="LATITUDE_STEP", default=1.0, type=float, help="Latitude step")
parser.add_argument('-max', dest="MAX_CITIES_PER_STEP", default=10, type=int, help="Max cities per step")
parser.add_argument('-out', dest="OUTPUT_FILE", default="data/ytGeoQueries.json", help="CSV output file")
parser.add_argument('-uout', dest="USER_OUTPUT_FILE", default="data/ytGeoQueriesU.json", help="CSV output file")
parser.add_argument('-probe', dest="PROBE", action="store_true", help="Just display info")
a = parser.parse_args()

fieldNames, cities = readCsv(a.INPUT_FILE)

for i, c in enumerate(cities):
    if not isNumber(c["population"]):
        cities[i]["population"] = 0

cities = sorted(cities, key=lambda c: -c["population"])
bucketCount = roundInt(180.0 / a.LATITUDE_STEP)
buckets = [[] for b in range(bucketCount)]
for c in cities:
    lat = c["lat"]
    bIndex = roundInt(norm(lat, (90.0, -90.0)) * (bucketCount-1))
    bLen = len(buckets[bIndex])
    if bLen < a.MAX_CITIES_PER_STEP:
        buckets[bIndex].append(c.copy())

queries = []
uqueries = []
for i, b in enumerate(buckets):
    lat = 180.0 - i * a.LATITUDE_STEP - 90.0
    latLabel = "%sN" % formatNumber(lat) if lat >= 0 else "%sS" % formatNumber(abs(lat))
    for c in b:
        q = {
          "label": "%s: %s, %s" % (latLabel, c["city"], c["iso2"]),
          "params": {
            "location": "%s,%s" % (c["lat"], c["lng"]),
            "locationRadius": "20km",
            "videoLicense": "creativeCommon",
            "publishedAfter": "2016-01-01T00:00:00Z"
          }
        }
        queries.append(q)
        uqueries.append({})

print("%s queries generated" % len(queries))

if not a.PROBE:
    writeJSON(a.OUTPUT_FILE, {"queries": queries})
    if not os.path.isfile(a.USER_OUTPUT_FILE):
        writeJSON(a.USER_OUTPUT_FILE, {"queries": uqueries})
