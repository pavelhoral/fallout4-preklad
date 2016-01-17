# P�eklad Fallout 4

Toto je z�kladn� projekt pro �esk� fanou�kovsk� p�eklad hry Fallout 4.

## Rozd�len� slo�ek

 * `assets` - zdrojov� datov� sobory p�ekladu
 * `flash` - zdrojov� flash projekty v FlashDevelop
 * `script` - NodeJS skripty pro pr�ci s projektem
 * `target` - soubory fin�ln� modifikace
 * `translated` - XML s p�elo�en�mi d�vkami
 * `workload` - definice p�ekladov�ch d�vek
 
## Skripty v projektu

Pro spu�t�n� skript� je nutn� m�t nainstalov�n 

Skripty v projektu jsou NodeJS skripty a Pro pr�ci s projektem je nutn� m�t *NodeJS* a �sp�n� instalace z�vislost� pomoc� p��kazu `npm install`.

Spu�t�n� skriptu:

    node script/nazev_skriptu.js [parametry]

Existuj�c� skripty:

 * `cleanup.js <XML>` - sma�e z p�ekladov�ho XML texty, kter� nepat�� do p��slu�n� d�vky
 * `compare.js <XML1> <XML2>` - porovn� rozd�ly a shody mezi dv�mi p�ekladov�mi soubory
 * `combine.js <XML1> <XML2>` - spoj� dva a v�ce p�ekladov�ch soubor� do jednoho
 * `modfile.js` - pokro�il� manipulace s ESM soubory

## V�voj Flashe

Projekty ve slo�ce `flash` jsou ps�ny v IDE "FlashDevelop":http://www.flashdevelop.org/. 
Pro sestaven� projekt� je nutn� m�t nainstalov�n "Flex SDK":http://www.adobe.com/devnet/flex/flex-sdk-download.html.

## Instalace p�ekladu

Postup pro vytvo�en� fin�ln�ho p�ekladu:

 * `node script/combine.js -a -o full.xml`
 * na��st vygenerovan� XML do p�eklada�e 
 * exportovat *Export STRINGS as...* do `target/Strings`

Postup pro instalaci p�ekladu do hry: 

 * obsah slo�ky `target` nahr�t do `{fallout.home}/Data`
 * `FalloutCustom.ini` ze slo�ky `target` nahr�t do `~/My Documents/My Games/Fallout4/`
