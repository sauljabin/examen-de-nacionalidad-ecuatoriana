# AGENT.md

Guía para agentes de IA (y personas) que trabajen en este repositorio.

## Qué es

Una página estática para practicar el examen de nacionalización ecuatoriana. Se publica con GitHub Pages desde `docs/` en <https://github.com/sauljabin/examen-de-nacionalidad-ecuatoriana>. Las preguntas se generan desde una exportación JSON de RemNote guardada en `backup/`.

Mantén siempre estos avisos en el README y en el pie de la página: el proyecto es **completamente gratuito**, tiene **fines exclusivamente pedagógicos** y **no es material oficial**.

## Convenciones

- **Código en inglés:** variables, funciones, comentarios y mensajes de los scripts.
- **Documentación y página en español:** README, este archivo, plantillas de issues y todo el texto que ve el usuario en `docs/`.
- **Terminología:** escribe siempre «nacionalización», nunca «naturalización». La única excepción es el nombre del trámite oficial, «carta de naturalización», cuando se enlaza a gob.ec.
- **Etiquetas de GitHub en español:** `error`, `incluir pregunta`, `mejora`, `accesibilidad`, `documentación`, `duda`, `duplicado`, `no válido`, `no se hará`, `se busca ayuda`, `buen primer aporte`. Las plantillas de `.github/ISSUE_TEMPLATE/` usan las tres primeras.

## Estructura

| Ruta | Qué contiene |
|---|---|
| `backup/*.rem` | Exportación original de RemNote. Es la fuente de verdad. No la modifiques. Está en `.gitignore` y nunca debe subirse: contiene el email y el identificador de la cuenta. |
| `scripts/convert_remnote.py` | Conversor de `.rem` a `docs/data/cards.json`. También descarga las imágenes y borra las que ya no se usan. Solo usa la biblioteca estándar de Python. |
| `docs/index.html`, `app.js`, `styles.css` | La página. JavaScript sin frameworks ni compilación. |
| `docs/data/cards.json` | Archivo generado. No lo edites a mano: cambia el conversor y vuelve a ejecutarlo. |
| `docs/images/` | Imágenes generadas por el conversor, con un nombre que es un hash de su URL de origen. |
| `.github/ISSUE_TEMPLATE/` | Formularios de issues. `app.js` enlaza a `error.yml` y `incluir-pregunta.yml` y rellena el campo `pregunta` por URL. |

## Formato de la exportación de RemNote

El `.rem` es un ZIP. Los archivos que importan:

- **`rem.json` → `docs`:** cada nota (*rem*) tiene `_id`, `parent`, `f` (orden entre hermanas), `key` (frente) y `value` (reverso).
- **`cards.json` → `docs`:** cada tarjeta tiene `k = "<remId>.<sufijo>"`. El sufijo es `f` (pregunta → respuesta), `b` (al revés) o el id de un *cloze* o de un rectángulo de oclusión.

La raíz del documento se llama «Naturalización»; sus hijas son las categorías y las hijas de cada categoría, las subcategorías. Las carpetas más profundas (por ejemplo, *Poderes del Estado › Poder Ejecutivo*) se guardan en el campo `topic` de cada tarjeta.

`key` y `value` son listas de texto enriquecido. Cada elemento es una cadena o un objeto con `i`:

| `i` | Significado |
|---|---|
| `m` | Texto con formato: `b` negrita, `tc` color (número del 1 al 9), `cId` hueco de *cloze*. |
| `q` | Referencia a otra rem (`_id`). Se muestra su texto. |
| `i` | Imagen: `url`, `width`, `height` y `blocks` (rectángulos de oclusión con `x`, `y`, `width` y `height` en fracciones de 0 a 1, más su `cId`). |
| `a` | Audio o video (por ejemplo, YouTube). Hoy se ignora. |

Casos especiales:

- En un *cloze*, todos los segmentos con el mismo `cId` se ocultan juntos en la misma tarjeta.
- En una oclusión, se revela el rectángulo cuyo `cId` coincide con el sufijo de la tarjeta.
- Una tarjeta `f` sin `value` es multilínea: la respuesta son sus rems hijas, una por línea.

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
        {"id": "…", "type": "image",
         "image": {"src": "images/x.png", "width": 790, "height": 592,
                   "blocks": [{"x": 0.5, "y": 0.1, "width": 0.4, "height": 0.3, "active": true}]}}
      ]
    }]
  }]
}
```

- `Segment` es `{"text", "bold"?, "color"?, "cloze"?}`; `cloze: true` marca el texto que queda oculto hasta revelar la respuesta.
- Una tarjeta puede tener `topic` (carpetas por debajo de la subcategoría).
- Si una subcategoría se llama igual que su categoría, se muestra como «General».

## Comandos

```bash
# Regenerar todas las preguntas
python3 scripts/convert_remnote.py backup/RemNoteExport_*.rem

# Servir la página en local
python3 -m http.server 8000 --directory docs
```

## Reglas

- La categoría «Archivados» se ignora siempre (`IGNORED_CATEGORIES` en el conversor).
- Exporta solo las tarjetas que existen en `cards.json`, para conservar el mazo original tal cual.
- Usa solo rutas relativas en `docs/`: GitHub Pages sirve el sitio bajo `/<repo>/`.
- La página debe funcionar en escritorio y en teléfonos (desde 360 px de ancho), con todos los tamaños de letra y sin desplazamiento horizontal. Pruébala en modo móvil con la letra más grande.
- Accesibilidad: las preferencias se guardan como atributos `data-*` en `<html>` (`data-font-size`, `data-theme`, `data-spacing`, `data-contrast`, `data-motion`) y en `localStorage`. Usa unidades `rem` para que el tamaño de letra escale todo. Todo debe poder usarse con teclado.
- El estilo debe ser propio y no imitar a RemNote.
