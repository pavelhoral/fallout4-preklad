# Překlad Fallout 4

Toto je základní projekt pro český fanouškovský překlad hry Fallout 4.

## Rozdělení složek

 * `assets/` - zdrojové datové sobory překladu
 * `flash/` - zdrojové flash projekty v FlashDevelop
 * `script/` - NodeJS skripty pro práci s projektem
 * `target/` - soubory finální modifikace
 * `translated/` - XML s přeloženými dávkami
 * `workload/` - definice překladových dávek

## Skripty v projektu

Pro spuštění skriptů je nutné mít nainstalován

Skripty v projektu jsou NodeJS skripty. Pro spuštění skriptu je nutná instalace závislostí pomocí příkazu `npm install`.

    node script/nazev_skriptu.js [parametry]

Existující skripty (pro informace o parametrech stačí spustit s `--help`):

 * `cleanup.js` - smaže z překladového XML texty, které nepatří do příslušné dávky
 * `compare.js` - porovná rozdíly a shody mezi dvěmi překladovými soubory
 * `combine.js` - spojí dva a více překladových souborů do jednoho
 * `modfile.js` - pokročilá manipulace s ESM soubory
 * `strings.js` - vyhledávání v překladových STRINGS souborech

## Vývoj Flashe

Projekty ve složce `flash` jsou psány v IDE [FlashDevelop](http://www.flashdevelop.org/).
Pro sestavení projektů je nutné mít nainstalován [Flex SDK](http://www.adobe.com/devnet/flex/flex-sdk-download.html).

## Instalace překladu

Postup pro vytvoření finálního překladu:

 * `node script/combine.js -a -o full.xml`
 * načíst vygenerované XML do překladače
 * exportovat *Export STRINGS as...* do `target/Strings`

Postup pro instalaci překladu do hry:

 * obsah složky `target` nahrát do `{fallout.home}/Data`
 * `FalloutCustom.ini` ze složky `target` nahrát do `~/My Documents/My Games/Fallout4/`
