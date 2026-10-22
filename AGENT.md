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
        {"id": "…", "type": "choice", "front": [Segment], "options": ["A", "B", "C", "D"], "answer": 0},
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
- `type: "basic"` necesita `front` y `back`. `type: "cloze"` necesita al menos un segmento con `cloze: true`. `type: "choice"` necesita `options` (de 2 a 4 textos) y `answer`, el índice de la correcta; la página muestra las opciones en orden aleatorio. Úsalo cuando una pregunta abierta tendría varias respuestas válidas. `type: "image"` necesita `image` con exactamente un bloque `active: true`, que es el que se revela, y un `front` con el enunciado (por ejemplo, «¿Cuál es la capital de esta provincia?»): sin él no se entiende qué se pregunta.
- `photo` (opcional) es una foto que aparece al revelar la respuesta: `{"src", "alt", "credit", "license", "url"}`. `url` es la página del archivo en Wikimedia Commons y `credit` es el autor; la página muestra los dos bajo la foto.
- `color` admite `red`, `orange`, `yellow`, `green`, `purple`, `blue`, `gray`, `brown` y `pink`.
- Después de editar, comprueba que el JSON es válido: `python3 -m json.tool docs/data/cards.json > /dev/null`.

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
- El estilo debe ser propio y no imitar a otras aplicaciones de tarjetas de estudio.
