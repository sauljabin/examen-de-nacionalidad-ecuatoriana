# Examen de Nacionalización Ecuatoriana

Página web para practicar el examen de nacionalización ecuatoriana con preguntas de estudio. Funciona en el navegador de la computadora y del teléfono. Tiene 673 preguntas sobre símbolos patrios, geografía, historia, política y cultura del Ecuador.

> [!IMPORTANT]
> **Este proyecto es completamente gratuito y tiene fines exclusivamente pedagógicos.** No es material oficial ni está avalado por ninguna institución del Estado ecuatoriano. El contenido puede contener errores u omisiones. Para requisitos y trámites, consulta la información oficial en [gob.ec: Obtención de la nacionalidad ecuatoriana por carta de naturalización](https://www.gob.ec/mremh/tramites/obtencion-nacionalidad-ecuatoriana-carta-naturalizacion).

No hay cuentas, publicidad ni servidor: todo pasa en tu navegador.

## Cómo se usa

1. En el inicio, elige las categorías y subcategorías que quieres practicar (por ejemplo, *Geografía › Volcanes*) y cuántas preguntas quieres.
2. Lee la pregunta y piensa la respuesta.
3. Pulsa **Ver respuesta**, toca la tarjeta o usa la barra espaciadora.
4. Indica si acertaste: **No** (tecla `1`) o **Sí** (tecla `2`).
5. Al final ves tu porcentaje por categoría y puedes repasar solo las preguntas falladas.

Puedes salir del examen en cualquier momento con el botón **Salir** o la tecla `Esc`.

### Accesibilidad

El botón **Accesibilidad**, arriba a la derecha, permite cambiar:

- el tamaño de la letra (cinco tamaños),
- el tema (automático, claro u oscuro),
- el espacio entre líneas,
- el alto contraste,
- las animaciones (se pueden reducir).

La configuración se guarda en tu navegador. La letra es [Atkinson Hyperlegible](https://www.brailleinstitute.org/freefont/), diseñada para personas con baja visión, y todo se puede usar con teclado.

### Tipos de pregunta

| Tipo | Cómo se ve |
|---|---|
| Pregunta y respuesta | La respuesta aparece debajo de la pregunta. |
| Texto con huecos | Cada parte oculta se ve como `?` y se completa al revelarla. |
| Imagen | Un recuadro amarillo tapa una parte de la imagen (por ejemplo, el nombre de una provincia en el mapa) y desaparece al revelarla. |

## Colaborar

¿Encontraste un dato incorrecto o quieres proponer una pregunta? Abre un *issue*:

- [Reportar un error](https://github.com/sauljabin/examen-de-nacionalidad-ecuatoriana/issues/new?template=error.yml): etiqueta `error`. Cada pregunta tiene un enlace que rellena el reporte por ti.
- [Proponer una pregunta](https://github.com/sauljabin/examen-de-nacionalidad-ecuatoriana/issues/new?template=incluir-pregunta.yml): etiqueta `incluir pregunta`.
- [Sugerir una mejora](https://github.com/sauljabin/examen-de-nacionalidad-ecuatoriana/issues/new?template=mejora.yml): etiqueta `mejora`.

Incluye una fuente cuando puedas.

## Estructura

```
backup/                     Exportación original de RemNote (.rem), solo en local
scripts/convert_remnote.py  Conversor de .rem a los datos de la página
docs/                       Página estática (lo que publica GitHub Pages)
  index.html, app.js, styles.css
  data/cards.json           Preguntas generadas por el conversor
  images/                   Imágenes descargadas de RemNote
.github/ISSUE_TEMPLATE/     Formularios para reportar errores y proponer preguntas
```

## Regenerar las preguntas

Necesitas Python 3.9 o superior; no hace falta instalar paquetes.

La carpeta `backup/` no está en el repositorio: la exportación de RemNote incluye datos de la cuenta (email, identificador de usuario), así que solo existe en la computadora del autor. Para regenerar las preguntas necesitas tu propia exportación.

El archivo `.rem` es un ZIP que exporta RemNote (*Exportar → JSON*). El conversor lee las notas (`rem.json`) y las tarjetas que RemNote había creado (`cards.json`), así que la página tiene exactamente las mismas preguntas. Respeta la organización del documento: el primer nivel son las categorías y el segundo, las subcategorías. Ignora la carpeta «Archivados» y descarga las imágenes a `docs/images/`.

```bash
python3 scripts/convert_remnote.py backup/RemNoteExport_*.rem
```

Para exportar solo algunas categorías, repite `--category`:

```bash
python3 scripts/convert_remnote.py backup/RemNoteExport_*.rem --category "Símbolos Patrios" --category "Historia"
```

## Probar en local

La página carga `data/cards.json` con `fetch`, así que hay que abrirla desde un servidor y no con doble clic:

```bash
python3 -m http.server 8000 --directory docs
```

Luego abre <http://localhost:8000>. Para probarla en tu teléfono, conéctalo a la misma red Wi-Fi y abre `http://<IP-de-tu-computadora>:8000`.

## Publicar en GitHub Pages

En el repositorio de GitHub: **Settings → Pages → Build and deployment**, elige *Deploy from a branch*, la rama `main` y la carpeta `/docs`.

## Licencia

Dedicado al dominio público con [CC0 1.0 Universal](LICENSE): puedes copiar, modificar y distribuir el código y el contenido sin pedir permiso ni dar crédito.

Algunas imágenes se basan en obras de terceros (por ejemplo, los mapas y el Escudo Nacional de Wikimedia Commons). Los símbolos patrios pertenecen al Estado ecuatoriano y la ley regula su uso. La dedicación CC0 solo cubre lo que es obra de los autores de este proyecto.
