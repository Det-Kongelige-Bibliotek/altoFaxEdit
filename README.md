# altoFaxEdit
ALTO med facsimile editor

## Intro
Det Kgl. Bibliotek (KB) har i 2018-2019 digitaliseret (scannet) og OCR-behandlet 28.650 tekstsider skrevet med fraktur (”gotiske” bogstaver) primært fra årene 1770-1773. Det er en samling af pamfletter hvor både papirkvaliteten og trykkekvaliteten er meget svingende. Resultaterne skal både anvendes til forskning og til visning på websider. OCR-resultaterne foreligger som XML-filer i standard ALTO-format.

## Forudsætninger
Applikationen afvikles som en webapplikation med en lille Python-backend, og med den primære funktionalitet i frontend vha. JavaScript, HTML og CSS.

For at sikre løsningen skal der benyttes Apache ”Basic authentication”.

Forudsætningerne for at installere applikationen er:

* Webserver (Apache)
* Python (version 3)
* Flask (Python package)
* Shell script (p.t. findes der start scripts til linux shells)

## Afhængigheder
Der findes ingen afhængigheder til andre applikationer, databaser eller lign. i forbindelse med selve installationen.

Der er afhængigheder under afvikling af applikationen som beskrevet under afsnit "Afvikling".

## Installation
Hent releasen fra:
https://github.com/Det-Kongelige-Bibliotek/altoFaxEdit/

Specifikt for version 1.1:
https://github.com/Det-Kongelige-Bibliotek/altoFaxEdit/releases/tag/v1.1

Udpak zip-release-filen på webserveren (fx <i>mockups-test-01.kb.dk</i>).

Det foreslås at benytte kataloget svarende til følgende URL (foreslået af boks@kb.dk):
```
https://mockups-test-01.kb.dk/bo/altoFaxEdit/v1.1/
```
Bo Krantz Simonsen (boks@kb.dk) oplyser d. 08-01-2020 at flg. katalog allerede er oprettet på serveren:
```
/home/web/bo/altoFaxEdit/v1.1
```

Start applikationen:
```shell
unzip altoFaxEdit-1.1.zip
cd altoFaxEdit-1.1
nohup ./start-prod.sh >> altofaxedit.log &
```

Applikationen starter nu og kører på port 5000 (default).

### Installation af opdatering
De fleste opdateringer vil ikke berøre Python- og Flask-koden. Derfor kan man nøjes med at hente zip-filen og og kun installere JS-, HTML- og CSS-filer. I dette tilfælde er det ikke nødvendigt at genstarte webserver eller Python-Flask-softwaren.

## Apache-opsætning
Applikationen benytter absolutte URL'er i forbindelse med routing, og fungerer derfor bedst med en virtual host-konfiguration i Apache med opsætning af reverse proxy (Apache benyttes for at implementere Basic Authentication).
Følgende er et eksempel på hvordan dette kan konfigureres i Apache (med SSL og htpasswd til Basic authentication):
```
<VirtualHost *:443>

   ServerName altofaxedit.kb.dk

  <Location "/">
    AuthType Basic
    AuthName "Authentication Required"
    AuthUserFile "/etc/htpasswd/.htpasswd"
    Require valid-user
  </Location>

   ProxyPass / http://localhost:5000/
   ProxyPassReverse / http://localhost:5000/

   RequestHeader set X-Remote-User %{REMOTE_USER}s

 </VirtualHost>
```

## Konfiguration
I kataloget **src** findes filen *config.properties* som indeholder opsætningen til applikationen:
```
[github]
url = https://api.github.com/repos/boks-kb-dk/trykkefrihedens-skrifter/contents
branch = Korrektur

[images]
url = https://kb-images.kb.dk/public/tekstportal/trykkefrihed-TEST/
```
Opsætningen kan redigeres mens applikationen kører, og vil træde i kraft med det sammen (uden reload af applikationen).

Bemærk, at ovenstående værdier er korrekte til test af applikationen fra d. 9. jan. 2020 og nogle dage frem.

## Afvikling
Applikationen afvikles i en browser som understøtter moderne webstandarder, fx Google Chrome. Flg. URL benyttes:
```
https://mockups-test-01.kb.dk/bo/altoFaxEdit/v1.1/
```
Applikationen vil dynamisk tilgå følgende:
* Github (repository med tekster i ALTO-filer)
* KB’s billedserver:  https://kb-images.kb.dk/public/

For at anvende applikationen er der sikkerhed i to niveauer:

1.	Login med Basic Authentication (der benyttes samme loginnavn og kode til alle brugere)
      - Efter login ses første webside i applikationen, men brugeren kan ikke tilgå data uden det næste login-niveau:
2.	Adgang til Github vha. et personligt Github-token som skabes/indtastes af hver bruger som har adgang til det ønskede Github-repositorie:
      - Se https://github.com/settings/tokens
      - KB’s vidensperson vedr. dette:  Bo Krantz Simonsen (boks@kb.dk)
