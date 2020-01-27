# altoFaxEdit Program Dokumentation
Dette er den tekniske dokumentation til programmet *altoFaxEdit*.
Dokumentationen er rettet mod udviklere som skal arbejde med programkoden. Programmet benytter Python (Flask) backend teknologi samt en web baseret frontend (HTML,CSS,JavaScript).

Kildekoden er dokumenteret med en beskrivelse i toppen af hver fil, beskrivelse af hver funktion, samt de steder i koden hvor det ikke er selvforklarende. Derfor skal dette dokument primært benyttes til at komme igang med programmet, og ikke en komplet detaljeres beskrivelse af hvert element i koden.

## Intro
altoFaxEdit er et hjælpeværktøj til redigering af XML filer i ALTO formatet. Formålet er at give slutbrugeren mulighed for at rette fejl som OCR softwaren ikke kan.

Programmet benytter github som *database* for XML filerne. Derved kan alle redigeringer i dokumenterne spores tilbage. Til hvert XML dokument findes også en billede-fil (det billede som er indscannet). Billedefilerne er placeret på KB's billedeserver, med filnavne som matcher XML filerne. På denne måde kan programmet præsentere sammenhængen imellem XML tekst og tekstens placering i det grafiske billede.

## Arkitektur & værktøjer
Valg af værktøj er foretaget ud fra KB's ønske om at benytte sprog som ikke skal kompileres, samt at applikationen skal kunne udbydes igennem en web browser, og være hurtig at arbejde med.
Derfor er følgende vørtøjer benyttet:
* Python & Flask (backend)
* Javascript & JQuery (frontend)

### Backend: Python / Flask API
Programmet startes som en Flask applikation på en server: `flask run`, hvorefter den indbyggede webserver startes (port 5000).
Flask sørger for at lave HTML templating og severer indhold til frontend. Desuden leveres der også de stastiske filer (CSS, JS) som skal benyttes i frontend.

### Frontend: JavaScript / JQuery
Frontend delen af applikationen leveres som statiske .js filer, som inkluderes i `base.html` filen. Så snart alle JavaScript filer er loaded, boostrappes frontend med et kald til en JavaSCript initialiserings funktion, og programmet et klar til brug. JavaScript koden benytter JQuery til DOM manipulation, AJAX kalde, XML parsing og meget mere.

### Integration til github
Programmet både læser og skriver filer til github. Dette er baseret på githubs REST API https://developer.github.com/v3/.

Sikkerheden til github er baseret på *personal access tokens*, hvor hver bruger skal have sit eget genererede token.
Dette token identificerer brugeren op mod github.com

Når programmet kalder github, sker dette (client-side), med brug at dette token. F.eks.:

```javascript
$.ajax({
        url: url,
        type: "GET",
        headers: {"Authorization": "token " + token},
        ...
```

## Filstruktur og filer

|Bibliotek | Fil | Beskrivelse|
|----------|-----|------------|
|.|Program Documentation.md|Dette dokument| 
|.|README.md|Github hoved dokument som b.l.a. beskriver installationen| 
|.|start-dev.sh|Shell script som åbner broweseren for udvikleren (*browsersync*).|
|.|start-prod.sh|Shell script der starter programmet i produktion.|
|.|start-server.sh|Shell script der starter programmet for udvikleren.|
|doc|AltoFaxEdit - Installationsvejledning.docx|Første udgave af installationsvejledningen.|
|doc|Principper for KB software leverancer - IT-wiki.pdf|Retningslinier for udvikling hos KB.|
|doc|Principper for dokumentation af KB applikationssystemer - IT-wiki.pdf|Retningslinier for udvikling hos KB.|
|doc|Webværktøj til redigering af ALTO-tekster med parallel visning af faksimile 20191127.docx|Oprindeligt design dokument (Bo Krantz Simonsen)|
|doc|altoFaxEdit - Test plan and evidence.xlsx|Testplan samt bevis for testcases.|
|src|config.properties|Inderholder server-side konfigurationen (github samt image repositories|
|src|main.py|Server hovedprogram|
|src/static||Indeholder alle statiske filer der benyttes i frontend|
|src/static/css|styles.css|CSS3 Stylesheet som benttes i hele applikationen|
|src/static/js|app.js|JavaScript hovedprogram (controller)|
|src/static/js|git.js|Javascript library som indeholder github integrationskode|
|src/static/js|image.js|Javascript library som indeholder kode til at hente billeder og tegne på canvas|
|src/static/js|text.js|Javascript library med kode til tekst/XML konvertering, formaettering m.m.|
|src/static/js|utils.js|Javascript library som indeholder diverse hjælpeværktøjer|
|src/templates|base.html|Flask HTML template som benyttes som basis for alle HTML sider|
|src/templates|main.html|Flask HTML template til hovedprogrammet|
|src/templates|setup.hmtl|Flask HTML template til konfifurations-siden.|


## Programbeskrivelse
Python hovedprogrammet som starter det hele på serveren hedder `main.py`. Dette indeholder en simpel backend controller, der validerer om brugeren har angivet sit github token (hvis ikke navigeres der til */setup*).

På klienten inkluderes alle JS filer. JavaScript koden som initialiserer (henter foldere fra github), igangsættes med følgende kode (fra app.js):

```javascript
// Bootstrap the application
if (window.location.pathname == '/') {
    $(document).ready(function() {
        afe.app.init();
    });
}
```

Design pattern for JavasScript er baseret på følgende:
* JavaScript koden er strukturet efter *module pattern* https://coryrylan.com/blog/javascript-module-pattern-basics
* Al JavaScript kode ligger i namespacet `afe`, som igen er opdelt i under-spaces : `afe.git, afe.text...`.
* JQuery benyttes til DOM manipulation (ikke native).
* Fil header samt alle functions er dokumenteret med kommentarer i koden.

Hovedprogrammet er *app.js*, som er ansvarlig for:
- At styre flow i programmet.
- Opsætte og levere event handlers
- Kalde andre *libraries* når der skal kommunikeres med github, henes billeder etc.

Der findes en enkelt CSS fil, som leverer styling til hele applikationen. Denne hedder *styles.css*.