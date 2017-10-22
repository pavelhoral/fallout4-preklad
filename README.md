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

## Instalace překladu

Postup pro vytvoření finálního překladu:

 * skripty očekávají existenci složky `shadow`, s originální `Strings` složkou a hlavním ESM souborem
 * spuštění `./build.sh` vytvoří finální překlady do složky `target` (více informací viz komentáře v samotném skriptu)

Postup pro instalaci překladu do hry:

 * obsah složky `target` nahrát do `{fallout.home}/Data`
 * `FalloutCustom.ini` ze složky `target` nahrát do `~/My Documents/My Games/Fallout4/`

## Instalátor

Pro vytvoření instalátoru je potřeba mít nainstalovaný WiX Toolset. MSI artefakt je pak možné sestavit pomocí:

    candle.exe -dProductVersion=0.0.1 fallout4-cestina.wxs
    light.exe fallout4-cestina.wixobj -ext WixUIExtension -ext WixUtilExtension -cultures:cs-cz

