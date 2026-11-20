# ADR-002: Morfología Cerebral 3D Procedural Adaptativa con Three.js

- **Estado:** Aceptado
- **Fecha:** 2026-11-19

## Contexto
El usuario requiere que la red neuronal *"se vea como un cerebro dependiendo de qué tantos datos se tengan"* y permita interactuar con cada memoria.

## Alternativas Consideradas
1. **Modelo `.glb` estático descargado de internet:** rompe el funcionamiento offline, no deforma orgánicamente los surcos/giros según el volumen de datos y aumenta el tamaño del repositorio.
2. **Grafo 2D (D3/Cytoscape):** no proporciona silueta cerebral anatómica ni sensación espacial de lóbulos y hemisferios.
3. **Geometría Procedural 3D en Three.js (`brainGeometry.ts` + `BrainMorphologyService.ts`):** genera matemáticamente ambos hemisferios separados por la fisura longitudinal, lóbulos frontal/temporal/parietal/occipital, cerebelo y tallo, desplazando vértices con ondas multi-octava (giros/surcos) cuya profundidad, escala y densidad luminosa crecen según `GrowthStage`.

## Decisión
Implementar renderizado **procedural 3D nativo en Three.js** acoplado al `GrowthStage` calculado en el dominio.

## Consecuencias
- **Positivas:** 100% offline y determinístico; evolución morfológica real controlada por el volumen de neuronas; 60 FPS fluidos con Raycasting directo por neurona.
- **Trade-offs:** Requiere calibración matemática cuidadosa de las envolventes anatómicas para que los hemisferios y lóbulos sean inconfundibles desde cualquier ángulo.
