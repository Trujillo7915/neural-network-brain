# Guía de Contribución / Contributing Guide

Gracias por tu interés en contribuir a **Neural Network Brain** (`neural-network-brain`).

## 1. Arranque Local Rápido

```bash
npm install
npm run build
npm start
```
Abre **http://127.0.0.1:4310** en tu navegador.

### Desarrollo con Hot Reload
```bash
# Terminal 1: API local (:4310)
npm run dev:api

# Terminal 2: Vite Frontend (:5173 con proxy a :4310)
npm run dev:web
```

### Contenedor Docker Compose
```bash
docker compose up --build
```

---

## 2. Topología del Repositorio

```text
neural-network-brain/
├── data/                  # starter-brain.json (semilla inicial) y local-brain.json (ignorado en git)
├── docs/                  # Documentación técnica, UML, ADRs y especificación OpenAPI 3.1
├── database/              # Esquema SQL DDL 3FN/BCNF (schema.sql) y semillas DML (seeds.sql)
├── scripts/               # Lector RO de Mem0, prueba de carga y supervisor 24/7 Windows
├── src/
│   ├── domain/            # Núcleo puro (0 dependencias externas ni Node IO)
│   ├── application/       # Casos de uso CQRS + DTOs inmutables
│   ├── infrastructure/    # Adaptador JSON local atómico + conectores externos RO + SRE
│   ├── presentation/      # Servidor HTTP, Middlewares (RFC 7807, Security, CorrelationID)
│   └── web/               # SPA React + Three.js 3D Brain
└── tests/                 # Unit, Integration, BDD y Architecture Fitness Functions
```

---

## 3. Estándares de Código y Quality Gate

- **Arquitectura Hexagonal:** Jamás importar `infrastructure` o `presentation` desde `domain` o `application`. Valida con `npm run test:fitness`.
- **Clean Code & Seguridad:** Funciones `< 50` líneas, archivos `< 800` líneas, validación Zod en los bordes, cero `console.log` en backend, cero secretos en código.
- **Conventional Commits:** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
- **Quality Gate obligatorio antes de abrir un PR:**
  ```bash
  npm run typecheck && npm run test:coverage && npm run build && npm audit
  ```
- **Licencia:** Al enviar contribuciones aceptas que se distribuyan bajo los términos de [Apache License 2.0](LICENSE) conservando las atribuciones de [NOTICE](NOTICE).
