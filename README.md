# Examen de Nacionalización Ecuatoriana

Página web para practicar el examen de nacionalización ecuatoriana con preguntas de estudio. Funciona en el navegador de la computadora y del teléfono. Tiene 675 preguntas sobre símbolos patrios, geografía, historia, política y cultura del Ecuador.

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

### Buscar preguntas

En el inicio hay un buscador: escribe una o varias palabras (por ejemplo, «Chimborazo» o «Julio Jaramillo») y aparecen las preguntas que las contienen, con su respuesta. No importan las tildes ni las mayúsculas.

### Usar sin conexión e instalar en el teléfono

Después de la primera visita con internet, la página funciona sin conexión: guarda la página, las preguntas y las imágenes de las preguntas (mapas, escudo y bandera). Las fotos de las respuestas se guardan a medida que las ves. Cuando vuelve la conexión, se descargan solas las preguntas actualizadas.

También se puede instalar como una app:

- **Android (Chrome):** acepta «Instalar app» o usa el menú ⋮ → **Agregar a pantalla de inicio**.
- **iPhone (Safari):** botón **Compartir** → **Agregar a pantalla de inicio**.

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
| Pregunta y respuesta | La respuesta aparece debajo de la pregunta. En lagos, volcanes, parques nacionales y la mayoría de los temas de Cultura (lugares, pintura, literatura, gastronomía, cine, teatro, música y danza) también aparece una foto. |
| Selección | Hay hasta cuatro opciones. Si la pregunta dice «Selecciona todas las respuestas correctas», puede haber varias: márcalas y pulsa **Comprobar** (o `Enter`). Al responder se marcan las correctas, el acierto se cuenta solo y suele aparecer una breve explicación. Las opciones se eligen también con las teclas `1` a `4`. |
| Texto con huecos | Cada parte oculta se ve como `?` y se completa al revelarla. |
| Imagen | Un recuadro amarillo tapa una parte de la imagen (por ejemplo, la capital de una provincia en el mapa) y desaparece al revelarla. |

## Colaborar

¿Encontraste un dato incorrecto o quieres proponer una pregunta? Abre un *issue*:

- [Reportar un error](https://github.com/sauljabin/examen-de-nacionalidad-ecuatoriana/issues/new?template=error.yml): etiqueta `error`. Cada pregunta tiene un enlace que rellena el reporte por ti.
- [Proponer una pregunta](https://github.com/sauljabin/examen-de-nacionalidad-ecuatoriana/issues/new?template=incluir-pregunta.yml): etiqueta `incluir pregunta`.
- [Sugerir una mejora](https://github.com/sauljabin/examen-de-nacionalidad-ecuatoriana/issues/new?template=mejora.yml): etiqueta `mejora`.

Incluye una fuente cuando puedas.

## Estructura

```
docs/                       Página estática (lo que publica GitHub Pages)
  index.html, app.js, styles.css
  sw.js, manifest.webmanifest  Uso sin conexión e instalación como app
  icons/                    Íconos de la app
  data/cards.json           Preguntas
  images/                   Imágenes de las preguntas
.github/ISSUE_TEMPLATE/     Formularios para reportar errores y proponer preguntas
```

## Editar las preguntas

Todas las preguntas están en `docs/data/cards.json`, agrupadas por categoría y subcategoría. Para corregir o añadir una, edita ese archivo; el formato está descrito en [AGENT.md](AGENT.md). Las imágenes van en `docs/images/`.

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

Algunas imágenes se basan en obras de terceros (por ejemplo, los mapas y el Escudo Nacional de Wikimedia Commons). Las fotos que aparecen con las respuestas son de Wikimedia Commons y conservan su propia licencia (CC0, CC BY, CC BY-SA o dominio público); el autor, la licencia y el enlace al original se muestran bajo cada foto. Los símbolos patrios pertenecen al Estado ecuatoriano y la ley regula su uso. La dedicación CC0 solo cubre lo que es obra de los autores de este proyecto.
