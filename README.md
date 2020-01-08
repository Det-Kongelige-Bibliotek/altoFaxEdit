# altoFaxEdit
Alto facsimile editor

## Intro
Det Kgl. Bibliotek (KB) har i 2018-2019 digitaliseret (scannet) og OCR-behandlet 28.650 tekstsider skrevet med fraktur (”gotiske” bogstaver) primært fra årene 1770-1773. Det er en samling af pamfletter hvor både papirkvaliteten og trykkekvaliteten er meget svingende. Resultaterne skal både anvendes til forskning og til visning på websider. OCR-resultaterne foreligger som XML-filer i standard ALTO-format.

## Forudsætninger
Applikationen afvikles som en web applikation, med en Python backend, og JavaScript,CSS,HTML frontend. For at sikre løsningen skal der benyttes ”Basic authentication”. Forudsætningerne for at installere applikationen er:

* Webserver (Apache)
* Python (version 3)
* Flask (Python package)
* Shell script (p.t. findes der start scripts til linux shells)

## Intallation
Applikationen hentes fra github (release), og flyttes til den server hvor applikationen skal køre. Herefter udpakkes denne, konfigureres og startes:
```shell
unzip altoFaxEdit-1.0.zip
cd altoFaxEdit-1.0
nohup ./start-prod.sh >> altofaxedit.log &
```

Applikationen starter nu op og kører på port 5000 (default)

## Apache opsætning
Applikationen benytter absolutte URL'er i forbindelse med routing, og fungerer derfor bedst i med en virtual host konfiguration i Apache med opsætning af reverse proxy (Apache benyttes for at implementere Basic Authentication).
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
Opsætningen kan redigeres mens applikationen kører, og vil træde i kraft med det sammen (uden reload af applikationen)

## Afhængigheder
Der findes ingen afhængigheder til andre applikationer, databaser eller lign. I forbindelse med selve installationen. For at afvikle applikationen, kræver det:
* Adgang til Github (repository med ALTO filer). Her skal brugeren benytte et ”Personal Access Token” som giver adgang til redigereing af dokumenter.
* Adgang til KB billede-arkiv: f.eks. https://kb-images.kb.dk/public/

