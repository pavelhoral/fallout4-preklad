# Překlad Fallout 4

Toto je základní projekt pro český fanouškovský překlad hry Fallout 4.


## Rozdělení složek

* `build/` - sestavené distribuční balíčky
* `script/` - NodeJS skripty pro práci s projektem
* `shadow/` - původní *ESM* a *Strings* soubory hry
* `source/asset/` - pomocné soubory překladu
* `source/data/` - datové soubory překladu
* `source/flash/` - zdrojové flash projekty v FlashDevelop
* `source/install/` - zdrojové soubory WiX Toolset instalátoru
* `source/l10n/` - XML s přeloženými dávkami
* `source/work/` - definice překladových dávek
* `target/` - soubory finální modifikace


## Skripty v projektu

Skripty v projektu jsou NodeJS skripty. Pro spuštění skriptu je nutná instalace závislostí pomocí příkazu `npm install`.

    node script/nazev_skriptu.js [parametry]

Existující skripty (pro informace o parametrech stačí spustit s `--help`):

 * `cleanup.js` - smaže z překladového XML texty, které nepatří do příslušné dávky
 * `compare.js` - porovná rozdíly a shody mezi dvěmi překladovými soubory
 * `combine.js` - spojí dva a více překladových souborů do jednoho
 * `compile.js` - vytvoří finální soubory překladu pro vložení do hry
 * `modfile.js` - pokročilá manipulace s ESM soubory
 * `package.js` - sestavení finálního překladu
 * `strings.js` - vyhledávání v překladových STRINGS souborech


## Vývoj Flashe

Projekty ve složce `flash` jsou psány v IDE [FlashDevelop](http://www.flashdevelop.org/).
Pro sestavení projektů je nutné mít nainstalován [Flex SDK](http://www.adobe.com/devnet/flex/flex-sdk-download.html).


## Sestavení překladu

Sestavení překladu závisí na souborech hry umístěných ve složce `shadow` extrahovaných z herních archivů (např. pomocí
nástroje [BSA Browser](https://www.nexusmods.com/skyrimspecialedition/mods/1756)):

* `shadow/Interface/Translate_en.txt` - zdrojové texty uživatelského rozhraní (není využito při sestavení, ale je nutné
  kontrolovat aktualizace)
* `shadow/Strings/` - překladové `_en.STRINGS`, `_en.DLSTRINGS` a `_en.ILSTRINGS` soubory
* `shadow/*.esm` - hlavní ESM soubory hry (`Fallout4.esm`, `DLCRobot.esm`, `DLCNukaWorld.esm`, ...)
* `shadow/*.esl` - základní Creation Club rozšíření, která jsou součástí základní hry

Verzi pro PC je možné sestavit příkazem:

    CLEAN= PACKAGE= ./build.sh

Verzi pro XB1 je možné sestavit příkazem:

    CLEAN= UNACCENT= ./build.sh

Verzi pro PS4 je možné sestavit příkazem:

    CLEAN= UNACCENT= BAKE= ./build.sh


## Instalace překladu

Ruční instalace sestaveného překladu (viz předchozí sekce):

 * obsah složky `target` nahrát do `{fallout.home}/Data`
 * `FalloutCustom.ini` ze složky `target` nahrát do `~/My Documents/My Games/Fallout4/`

 ## Tvorba instalátoru

Pro vytvoření instalátoru je potřeba mít nainstalovaný WiX Toolset. MSI artefakt je pak možné sestavit pomocí:

    candle.exe -dProductVersion=0.0.1 fallout4-cestina.wxs
    light.exe fallout4-cestina.wixobj -ext WixUIExtension -ext WixUtilExtension -cultures:cs-cz
