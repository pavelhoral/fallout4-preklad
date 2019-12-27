#!/bin/bash
#
# Build translation for distribution.
#
# Supported variables:
#
# - CLEAN = Whether to remove previous build artefacts.
# - FILTER = Build only a subset of translation with the given prefix.
# - PLUGIN = Name of the plugin to exclusively build.
# - UNACCENT = Whether to remove accents from the translation.
# - PACKAGE = Whether to run final package creation.
#

set -e

# Plugins to be built by default
DEFAULT_PLUGINS='Fallout4 DLCworkshop01 DLCworkshop02 DLCworkshop03 DLCRobot DLCCoast DLCNukaWorld Fallout4_VR'

# Modfile names for baked plugins
declare -A BAKED_PLUGINS
BAKED_PLUGINS[Fallout4]=f4
BAKED_PLUGINS[DLCworkshop01]=d1
BAKED_PLUGINS[DLCworkshop02]=d2
BAKED_PLUGINS[DLCworkshop03]=d3
BAKED_PLUGINS[DLCRobot]=d4
BAKED_PLUGINS[DLCCoast]=d5
BAKED_PLUGINS[DLCNukaWorld]=d6

# Clean previous builds if requested
if [[ -v CLEAN ]]; then
    rm -rf build target/*
fi

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

# Bake translations into a plugin modfile
function bake_modfile {
    echo "Baking $PLUGIN..."
    BAKED_NAME="${BAKED_PLUGINS[$PLUGIN]}czep.esp"
    BAKE_OPTS="-m shadow/$PLUGIN.esm -s target/Strings -o target/$BAKED_NAME"
    script/modfile.js bake $BAKE_OPTS
}

# Build base distribution files
function run_build {
    echo "Building $PLUGIN..."
    run_combine
    run_compile
    if [[ -v BAKE ]] && [[ ! -z "${BAKED_PLUGINS[$PLUGIN]}" ]]; then
        bake_modfile
    fi
}

if [[ -v PLUGIN ]]; then
    run_build
else
    for PLUGIN in $DEFAULT_PLUGINS; do
        PLUGIN=$PLUGIN run_build
    done
fi

if [[ -v PACKAGE ]]; then
    script/package.js -bzm
fi
