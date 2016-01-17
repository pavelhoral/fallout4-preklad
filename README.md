# Pøeklad Fallout 4

Toto je základní projekt pro èeský fanouškovský pøeklad hry Fallout 4.

## Rozdìlení složek

 * `assets` - zdrojové datové sobory pøekladu
 * `flash` - zdrojové flash projekty v FlashDevelop
 * `script` - NodeJS skripty pro práci s projektem
 * `target` - soubory finální modifikace
 * `translated` - XML s pøeloženými dávkami
 * `workload` - definice pøekladových dávek
 
## Skripty v projektu

Pro spuštìní skriptù je nutné mít nainstalován 

Skripty v projektu jsou NodeJS skripty a Pro práci s projektem je nutné mít *NodeJS* a úspìšná instalace závislostí pomocí pøíkazu `npm install`.

Spuštìní skriptu:

    node script/nazev_skriptu.js [parametry]

Existující skripty:

 * `cleanup.js <XML>` - smaže z pøekladového XML texty, které nepatøí do pøíslušné dávky
 * `compare.js <XML1> <XML2>` - porovná rozdíly a shody mezi dvìmi pøekladovými soubory
 * `combine.js <XML1> <XML2>` - spojí dva a více pøekladových souborù do jednoho
 * `modfile.js` - pokroèilá manipulace s ESM soubory

## Vývoj Flashe

Projekty ve složce `flash` jsou psány v IDE "FlashDevelop":http://www.flashdevelop.org/. 
Pro sestavení projektù je nutné mít nainstalován "Flex SDK":http://www.adobe.com/devnet/flex/flex-sdk-download.html.

## Instalace pøekladu

Postup pro vytvoøení finálního pøekladu:

 * `node script/combine.js -a -o full.xml`
 * naèíst vygenerované XML do pøekladaèe 
 * exportovat *Export STRINGS as...* do `target/Strings`

Postup pro instalaci pøekladu do hry: 

 * obsah složky `target` nahrát do `{fallout.home}/Data`
 * `FalloutCustom.ini` ze složky `target` nahrát do `~/My Documents/My Games/Fallout4/`
