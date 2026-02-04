# JobTracker Agent

## Requisitos
- macOS: otorgar permisos de **Screen Recording** y **Accessibility**.
- Windows: permitir captura de pantalla.

## Uso
```bash
npm run dev -w @jobtracker/agent
```

## Autostart
En el agente puedes activar “Iniciar con el sistema” (usa `app.setLoginItemSettings`).

## Actualizaciones
El agente usa `electron-updater`. Las actualizaciones solo funcionan en builds empaquetados.

## URL Bridge
El agente levanta un servidor local en `http://127.0.0.1:17330` para recibir URLs desde la extensión.

## Flujo
1. Login con usuario y contraseña.
2. Registro de dispositivo automático.
3. Start/Stop tracking manual.
