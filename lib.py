import csv
import json
import os

def formatNumber(value):
    return "{0}".format(str(value if value % 1 > 0 else int(value)))

def isNumber(value):
    try:
        num = float(value)
        return True
    except ValueError:
        return False

def lim(value, ab=(0, 1)):
    a, b = ab
    return max(a, min(b, value))

def norm(value, ab, limit=False):
    a, b = ab
    n = 0.0
    if (b - a) != 0:
        n = 1.0 * (value - a) / (b - a)
    if limit:
        n = lim(n)
    return n

def parseNumber(string, alwaysFloat=False):
    try:
        string = string.strip().replace(",", "")
        num = float(string)
        if "." not in str(string) and "e" not in str(string) and not alwaysFloat:
            num = int(string)
        return num
    except ValueError:
        return string

def parseNumbers(arr):
    for i, item in enumerate(arr):
        if isinstance(item, (list,)):
            for j, v in enumerate(item):
                arr[i][j] = parseNumber(v)
        else:
            for key in item:
                arr[i][key] = parseNumber(item[key])
    return arr

def readCsv(filename, doParseNumbers=True, skipLines=0, encoding="utf8", readDict=True, verbose=True, delimiter=","):
    rows = []
    fieldnames = []
    if os.path.isfile(filename):
        lines = []
        with open(filename, 'r', encoding="utf8") as f:
            lines = list(f)
        if skipLines > 0:
            lines = lines[skipLines:]
        lines = [line for line in lines if not line.startswith("#")]
        if readDict:
            reader = csv.DictReader(lines, skipinitialspace=True, delimiter=delimiter)
            fieldnames = list(reader.fieldnames)
        else:
            reader = csv.reader(lines, skipinitialspace=True)
        rows = list(reader)
        if doParseNumbers:
            rows = parseNumbers(rows)
        if verbose:
            print("Read %s rows from %s" % (len(rows), filename))
    return (fieldnames, rows)

def roundInt(val):
    return int(round(val))

def writeJSON(filename, data, verbose=True):
    with open(filename, 'w') as f:
        json.dump(data, f)
        if verbose:
            print("Wrote data to %s" % filename)
