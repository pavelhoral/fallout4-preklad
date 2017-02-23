#!/bin/bash
#
# Build translation for distribution.
#
# Supported variables:
#
# - FILTER = Build only a subset of translation with the given prefix.
# - PLUGIN = Name of the plugin to exclusively build.
# - UNACCENT = Whether to remove accents from the translation.
# - PACKAGE = Whether to run final package creation.
#

# Make sure we have a working directory
WORKDIR=".tmp";
mkdir -p $WORKDIR

# Combine translation files into one XML
function run_combine {
    COMBINE_OPTS="-o $WORKDIR/$PLUGIN.xml"
    node script/combine $COMBINE_OPTS translated/$PLUGIN/$FILTER*
}

# Compile translation into STRINGS
function run_compile {
    COMPILE_OPTS="-s shadow/Strings"
    if [[ -v UNACCENT ]]; then
        COMPILE_OPTS="$COMPILE_OPTS -u"
    fi
    node script/compile $COMPILE_OPTS $WORKDIR/$PLUGIN.xml
}

# Build base distribution files
function run_build {
    echo "Building $PLUGIN..."
    run_combine
    run_compile
}

# Build final distribution package
function run_package {
    export BUILDID="$(date +%Y%m%d)-f4cs-$(git rev-parse --short HEAD)-${FILTER:-full}"
    node script/package
}

if [[ -v PLUGIN ]]; then
    run_build
else
    for PLUGIN_DIR in translated/*; do
        PLUGIN=$(basename $PLUGIN_DIR) run_build
    done
fi

if [[ -v PACKAGE ]]; then
    run_package
fi
