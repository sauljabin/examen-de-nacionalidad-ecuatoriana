# AGENT.md

Guía para agentes de IA (y personas) que trabajen en este repositorio.

## Qué es

Una página estática para practicar el examen de nacionalización ecuatoriana. Se publica con GitHub Pages desde `docs/` en <https://github.com/sauljabin/examen-de-nacionalidad-ecuatoriana>. Todas las preguntas están en `docs/data/cards.json`, que se edita a mano.

Las preguntas vinieron originalmente de una exportación de RemNote. El conversor (`scripts/convert_remnote.py`) y su documentación se quitaron del repositorio; si alguna vez hace falta volver a convertir una exportación, recupéralos del historial de git (commit `85e5832`).

Mantén siempre estos avisos en el README y en el pie de la página: el proyecto es **completamente gratuito**, tiene **fines exclusivamente pedagógicos** y **no es material oficial**.

## Convenciones

- **Código en inglés:** variables, funciones, comentarios y mensajes de los scripts.
- **Documentación y página en español:** README, este archivo, plantillas de issues y todo el texto que ve el usuario en `docs/`.
- **Terminología:** escribe siempre «nacionalización», nunca «naturalización». La única excepción es el nombre del trámite oficial, «carta de naturalización», cuando se enlaza a gob.ec.
- **Etiquetas de GitHub en español:** `error`, `incluir pregunta`, `mejora`, `accesibilidad`, `documentación`, `duda`, `duplicado`, `no válido`, `no se hará`, `se busca ayuda`, `buen primer aporte`. Las plantillas de `.github/ISSUE_TEMPLATE/` usan las tres primeras.

## Estructura

| Ruta | Qué contiene |
|---|---|
| `docs/index.html`, `app.js`, `styles.css` | La página. JavaScript sin frameworks ni compilación. |
| `docs/sw.js`, `docs/manifest.webmanifest`, `docs/icons/` | Uso sin conexión (service worker) e instalación como app. |
| `scripts/build_part_images.py`, `assets/` | Generador de las imágenes de las partes del escudo y de la bandera, y los SVG oficiales que usa. |
| `docs/data/cards.json` | Todas las preguntas. Es la fuente de verdad: edítalo directamente. |
| `docs/images/` | Imágenes de las preguntas, referenciadas desde `cards.json` con rutas relativas (`images/…`). |
| `.github/ISSUE_TEMPLATE/` | Formularios de issues. `app.js` enlaza a `error.yml` y `incluir-pregunta.yml` y rellena el campo `pregunta` por URL. |

## Formato de `docs/data/cards.json`

```json
{
  "categories": [{
    "id": "simbolos-patrios",
    "title": "Símbolos Patrios",
    "subcategories": [{
      "id": "bandera-nacional",
      "title": "Bandera Nacional",
      "cards": [
        {"id": "…", "type": "basic", "front": [Segment], "back": [Segment]},
        {"id": "…", "type": "cloze", "front": [Segment]},
        {"id": "…", "type": "choice", "front": [Segment], "options": ["A", "B", "C", "D"], "answer": 0,
         "explanation": "…"},
        {"id": "…", "type": "choice", "front": [Segment], "options": ["A", "B", "C", "D"], "answer": [0, 2]},
        {"id": "…", "type": "image", "front": [Segment],
         "image": {"src": "images/x.png", "width": 790, "height": 592,
                   "blocks": [{"x": 0.5, "y": 0.1, "width": 0.4, "height": 0.3, "active": true}]}}
      ]
    }]
  }]
}
```

- `Segment` es `{"text", "bold"?, "color"?, "cloze"?}`; `cloze: true` marca el texto que queda oculto hasta revelar la respuesta.
- Una tarjeta puede tener `topic` (carpetas por debajo de la subcategoría).
- Los `id` de categoría y subcategoría son el título en minúsculas, sin tildes y con guiones (`simbolos-patrios`).
- Los `id` de tarjeta deben ser únicos; aparecen en los reportes de error. Para una tarjeta nueva, usa cualquier cadena única.
- `type: "basic"` necesita `front` y `back`. `type: "cloze"` necesita al menos un segmento con `cloze: true`. `type: "choice"` necesita `options` (de 2 a 4 textos) y `answer`: el índice de la correcta, o una lista de índices si hay varias correctas (entonces la página pide «Selecciona todas las respuestas correctas» y muestra el botón **Comprobar**). Las opciones aparecen en orden aleatorio. Úsalo cuando una pregunta abierta tendría varias respuestas válidas o cuando es fácil confundir la respuesta con un dato parecido.
- `explanation` (opcional, solo en `choice`) es un texto corto que aparece al responder. Úsalo para no perder el contexto que tendría una respuesta abierta: por qué las otras opciones no son correctas, la lista completa o un dato que ayude a recordar. `type: "image"` necesita `image` con exactamente un bloque `active: true`, que es el que se revela, y un `front` con el enunciado (por ejemplo, «¿Cuál es la capital de esta provincia?»): sin él no se entiende qué se pregunta.
- `photo` (opcional) es una foto que aparece al revelar la respuesta: `{"src", "alt", "credit", "license", "url"}`. `url` es la página del archivo en Wikimedia Commons y `credit` es el autor; la página muestra los dos bajo la foto.
- `color` admite `red`, `orange`, `yellow`, `green`, `purple`, `blue`, `gray`, `brown` y `pink`.
- Después de editar, comprueba que el JSON es válido: `python3 -m json.tool docs/data/cards.json > /dev/null`.

## Estilo de las preguntas

- Toda respuesta de pregunta y respuesta termina en punto, también después de un paréntesis o de comillas; las que terminan en «!» o «?» se dejan así. En las respuestas con viñetas, cada línea termina en punto.
- Las respuestas empiezan con mayúscula.
- Las preguntas llevan los dos signos: «¿…?». Las frases para completar («El día de la Bandera se celebra el») no llevan signos.
- Usa comillas españolas: «…», no comillas rectas.
- Las funciones del Estado se llaman como en la Constitución: «Función Ejecutiva», «Función Legislativa», «Función Judicial», «Función Electoral» y «Función de Transparencia y Control Social», no «Poder…».
- Escribe «Cusco», «océano Pacífico» y «Constitución» con mayúscula cuando nombra una constitución concreta («la Constitución de 2008»).
- Las opciones de las preguntas de selección no llevan punto final.

## Comandos

```bash
# Servir la página en local
python3 -m http.server 8000 --directory docs
```

## Reglas

- Usa solo rutas relativas en `docs/`: GitHub Pages sirve el sitio bajo `/<repo>/`.
- La página debe funcionar en escritorio y en teléfonos (desde 360 px de ancho), con todos los tamaños de letra y sin desplazamiento horizontal. Pruébala en modo móvil con la letra más grande.
- Accesibilidad: las preferencias se guardan como atributos `data-*` en `<html>` (`data-font-size`, `data-theme`, `data-spacing`, `data-contrast`, `data-motion`) y en `localStorage`. Usa unidades `rem` para que el tamaño de letra escale todo. Todo debe poder usarse con teclado.
- Fotos de las respuestas: usa solo imágenes con licencia libre de Wikimedia Commons (CC0, CC BY, CC BY-SA o dominio público) y guarda siempre autor, licencia y enlace en `photo`. No uses fotos de obras de arte cuyo autor murió hace menos de 70 años (por ejemplo, Guayasamín, Kingman o Egas): la licencia de la foto no cubre la obra. En esos casos usa un retrato del artista o no pongas foto. Guárdalas en `docs/images/foto-<tema>.jpg`, de 900 px de lado como máximo.
- Las tarjetas de *Partes del Escudo Nacional* y *Partes de la Bandera Nacional* usan SVG generados (`docs/images/escudo-*.svg` y `bandera-*.svg`) con el escudo o la bandera oficiales de `assets/`, un indicador, el nombre de la parte y su descripción. No los edites a mano: cambia `COAT_PARTS` o `FLAG_PARTS` en `scripts/build_part_images.py` y ejecútalo; el script también recalcula en `cards.json` el recuadro que tapa la descripción. Mantén esos textos coherentes con las tarjetas de texto equivalentes de *Escudo Nacional* y *Bandera Nacional*.
- Sin conexión: `docs/sw.js` pide a la red primero la página y `cards.json` (así las correcciones llegan en la siguiente visita con internet) y usa la caché primero para las imágenes. Si cambias el contenido de una imagen sin cambiarle el nombre, sube `VERSION` en `sw.js`; si agregas un archivo nuevo a la página (otro `.js` o `.css`), añádelo a `SHELL`.
- El estilo debe ser propio y no imitar a otras aplicaciones de tarjetas de estudio.
