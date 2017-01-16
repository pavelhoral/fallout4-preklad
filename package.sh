#!/bin/bash

# First argument can specify type
TYPE="$1"
# Assemble build identifier
BUILDID="$(date +%Y%m%d)-f4cs-$(git rev-parse --short HEAD)-${TYPE:-'full'}"

# Combine translation files into one XML
COMBINE_OPTS="-o translated.xml"
node script/combine $COMBINE_OPTS translated/$TYPE*

# Compile translation into STRINGS
COMPILE_OPTS="-s shadow"
if [[ -v UNACCENT ]]; then
    COMPILE_OPTS="$COMPILE_OPTS -u"
fi
node script/compile $COMPILE_OPTS translated.xml

# Make distributable package
BUILDID=$BUILDID node script/package
