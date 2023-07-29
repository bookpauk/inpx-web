#!/bin/sh

set -e

OPTS="--lib-dir=/library --app-dir=/app/data"

[ -z ${INDEX_FILE+x} ] || OPTS="$OPTS --inpx=\"${INDEX_FILE}\""
[ -z ${RECREATE+x} ] || OPTS="$OPTS --recreate"

echo Starting ./inpx-web $OPTS
./inpx-web $OPTS