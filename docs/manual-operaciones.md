# Manual de Operaciones y Runbooks (SOP) — Neural Network Brain

**Versión:** 1.0.0  
**Autor:** Fabián Ricardo Trujillo González (`@Trujillo7915`)  

---

## 1. Acuerdos de Servicio (SLA / SLO / SLI)

| Indicador (SLI) | Objetivo (SLO) | Fuente |
|---|---|---|
| Disponibilidad local | `>= 99.5%` | `GET /api/v1/health?mode=liveness` |
| Latencia API P95 | `< 150 ms` | `GET /api/v1/metrics` |
| Tasa de error HTTP 5xx | `< 0.5%` | `neural_brain_http_errors_total` |

---

## 2. Runbooks Operativos (SOP)

### SOP-00: Operación 24/7 en Windows (Opcional)
Para mantener el cerebro activo permanentemente en segundo plano en Windows:
```powershell
npm run service:install   # Registra tarea NeuralNetworkBrain24x7 (AtLogOn + watchdog)
npm run service:status    # Consulta estado de tarea, puerto :4310 y salud HTTP
npm run service:stop      # Detiene el servicio de forma controlada
```

### SOP-01: Despliegue con Docker Compose
```bash
docker compose up --build -d
```
El volumen `./data:/app/data` persiste tu archivo `local-brain.json` entre recreaciones del contenedor.

### SOP-02: Respaldo y Restauración de Memorias (`RPO / RTO`)
- **Backup:** copiar el archivo `./data/local-brain.json` a un almacenamiento seguro.
- **Restauración a fábrica:** detener el servidor, borrar `./data/local-brain.json` y volver a iniciar; el sistema re-siembra automáticamente desde `./data/starter-brain.json` (`RTO < 1 min`).

### SOP-03: Diagnóstico de Conectores Externos (`ENABLE_EXTERNAL_STORES=true`)
1. Consultar `GET /api/v1/health` para revisar el arreglo `stores[]` y `circuits[]`.
2. Verificar rutas en `.env` (`AMEM_FILE_PATH`, `MEM0_HOME`, `ECC_HOME`) y disponibilidad del entorno Python de Mem0 si se habilitó.
3. Esperar `15 s` (`CIRCUIT_RESET_MS`) o invocar `POST /api/v1/brain/refresh`.
