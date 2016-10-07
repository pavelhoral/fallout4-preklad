#!/bin/bash

# First argument can specify type
TYPE="$1"
# Assemble build identifier
BUILDID=$(date +%Y%m%d)-f4cs-$(git rev-parse --short HEAD)-${TYPE:-'full'}

node script/combine -o translated.xml translated/$TYPE*
node script/compile -s shadow translated.xml
BUILDID=$BUILDID node script/package
