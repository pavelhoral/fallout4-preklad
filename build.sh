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

set -e

# Plugins to be built by default
DEFAULT_PLUGINS='Fallout4 DLCworkshop01 Fallout4_VR'

# Make sure we have a working directory
WORKDIR="build/.tmp";
mkdir -p $WORKDIR

# Combine translation files into one XML
function run_combine {
    COMBINE_OPTS="-o $WORKDIR/$PLUGIN.xml"
    script/sstxml.js combine $COMBINE_OPTS source/l10n/$PLUGIN/$FILTER*
}

# Compile translation into STRINGS
function run_compile {
    COMPILE_OPTS="-s shadow/Strings"
    if [[ -v UNACCENT ]]; then
        COMPILE_OPTS="$COMPILE_OPTS -u"
    fi
    script/compile.js $COMPILE_OPTS $WORKDIR/$PLUGIN.xml
}

# Build base distribution files
function run_build {
    echo "Building $PLUGIN..."
    run_combine
    run_compile
}

if [[ -v PLUGIN ]]; then
    run_build
else
    for PLUGIN_DIR in $DEFAULT_PLUGINS; do
        PLUGIN=$(basename $PLUGIN_DIR) run_build
    done
fi

if [[ -v PACKAGE ]]; then
    script/package.js -bzm
fi
