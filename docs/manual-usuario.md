# Manual del Usuario — Neural Network Brain (`v1.0.0`)

Bienvenido a **Neural Network Brain**, tu cerebro visual 3D interactivo para almacenar, conectar y explorar conocimiento, proyectos, decisiones y rutas técnicas.

---

## 1. Inicio en 1 Minuto

```bash
npm install
npm run build
npm start
```
Abre **http://127.0.0.1:4310** en tu navegador. En el primer arranque verás **24 neuronas iniciales** organizadas como una *Corteza en Desarrollo*.

---

## 2. Cómo Evoluciona el Cerebro Según Tus Datos

1. **Corteza Embrionaria (`0–19` neuronas):** Silueta translúcida naciente con núcleos iniciales.
2. **Corteza en Desarrollo (`20–59` neuronas):** Hemisferios diferenciados con pliegues corticales emergentes.
3. **Corteza Madura (`60–179` neuronas):** Surcos definidos, cuerpo calloso iluminado y clústeres funcionales.
4. **Neocorteza Hiperconectada (`180+` neuronas):** Máxima densidad cortical y cascadas sinápticas multi-lóbulo.

---

## 3. Cómo Crear, Vincular y Explorar Memorias

1. **Crear una Nueva Memoria:**
   - Pulsa **+ Nueva Memoria** en la barra superior.
   - Escribe un título, el contenido (puede incluir rutas como `./src/api`, URLs o puertos como `:4310`), elige la categoría/lóbulo, añade etiquetas y, si deseas, enlázala de inmediato con una neurona existente.
2. **Inspeccionar y Navegar Sinapsis:**
   - Haz clic sobre cualquier esfera luminosa en el cerebro 3D o selecciónala en el panel izquierdo.
   - El **Inspector de Memoria** a la derecha muestra el texto íntegro, etiquetas, barra de confianza, chips copiables de **Ubicaciones Vinculadas** y las tarjetas navegables de **Conexiones Sinápticas**.
   - Desde el Inspector también puedes **vincular una nueva sinapsis en 1 clic** o **eliminar** memorias locales.
3. **Buscar y Filtrar:**
   - Busca por palabras clave, etiquetas o rutas en el buscador izquierdo, o haz clic en un lóbulo (*Frontal, Temporal, Parietal, Occipital, Cerebelo, Límbico*) para enfocar la cámara suavemente sobre esa región.
4. **Probar el Simulador de Crecimiento:**
   - Pulsa **Probar** junto a *Simulador de Crecimiento* y desliza de `5` a `500` neuronas para previsualizar la evolución morfológica sin modificar tus datos reales.
